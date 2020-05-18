/* eslint-disable new-cap, no-param-reassign, no-unreachable, no-multi-assign */
import ApolloClient from "apollo-client";
import { InMemoryCache } from 'apollo-cache-inmemory';
import { split } from 'apollo-link';
import { setContext } from 'apollo-link-context';
import { createHttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import gql from 'graphql-tag'

import neo4j from 'neo4j-driver';

import getWorkspaceQuery from './getWorkplaceQuery';
import onWorkspaceChangeSubscription from './workspaceChangeSubscription';

import Neo4jConnect from './components/Connect.vue';
import Neo4jDatabaseInformation from './components/DatabaseInformation.vue';

const VueNeo4j = {
    install: Vue => {
        let driver;
        let context;
        let graph;
        let database;

        let client;
        let observable;

        /**
         * Connect to the Neo4j
         */
        const init = () => {
            // Prefer the injected API
            if ( window.neo4jDesktopApi )  {
                window.neo4jDesktopApi.getContext()
                    .then(workplace => _setNeo4jContext({ data: { workplace } }));
            }
            else if ( url.searchParams.has('neo4jDesktopApiUrl') ) {
                const client = getGraphQLClient()

                // Subscribe to Workspace Changes
                observable = client.subscribe({
                    query: onWorkspaceChangeSubscription
                });
                observable.subscribe(_setNeo4jContext);

                // Get Workspace Information
                client.query({
                    query: getWorkspaceQuery
                }).then(data => _setNeo4jContext(data));
            }
        }

        const getGraphQLClient = () => {
            // Get GraphQL endpoint info from the URL
            const url = new URL(window.location.href);

            if ( !url.searchParams.has('neo4jDesktopApiUrl') || !url.searchParams.has('neo4jDesktopGraphAppClientId') ) {
                throw new Error("Couldn't find neo4jDesktopApiUrl or neo4jDesktopGraphAppClientId in the URL search params.  Are you running this app in Neo4j Desktop?")
            }

            const apiEndpoint = url.searchParams.get('neo4jDesktopApiUrl').split("//")[1];
            const apiClientId = url.searchParams.get('neo4jDesktopGraphAppClientId');

            // Create HTTP Link
            const httpLink = createHttpLink({
                uri: `http://${apiEndpoint}/`,
            });

            // Create WS Link
            const wsLink = new WebSocketLink({
                uri: `ws://${apiEndpoint}/`,
                options: {
                    reconnect: true,
                    connectionParams: {
                        ClientId: apiClientId
                    }
                }
            });

            // Auth Link
            const authLink = setContext((_, {headers}) => {
                return {
                    headers: {
                        ...headers,
                        ClientId: apiClientId
                    }
                }
            });

            // Split the links
            const link = split(
                // split based on operation type
                ({query}) => {
                    const {kind, operation} = getMainDefinition(query);
                    return kind === 'OperationDefinition' && operation === 'subscription';
                },
                wsLink,
                authLink.concat(httpLink),
            );

            // Create Apollo Client
            client = new ApolloClient({
                link,
                cache: new InMemoryCache()
            });

            return client
        }

        /**
         * Send metrics to the GraphQL API
         *
         * @param {String} category
         * @param {String} label
         * @param {MetricsProperty[]} properties
         * @param {String} userId
         */
        const sendMetrics = (category, label, properties, userId) => {
            const client = getGraphQLClient()

            const mutation = gql`
                mutation SendMetrics($event: MetricsEvent!) {
                    sendMetrics(event: $event)
                }
            `
            return client.mutate({
                mutation,
                variables: {
                    event: {
                        category,
                        label,
                        properties: properties || [],
                        userId,
                    },
                },
            })
        }

        /**
         * Set the current context
         */
        const _setNeo4jContext = ({ data }) => {
            const { workplace, } = data;
            const { me, host, projects, } = workplace;

            context = {
                me,
                host,
                projects,
            }
        }

        /**
         * Register Component
         */
        Vue.component(Neo4jConnect.name, Neo4jConnect);
        Vue.component(Neo4jDatabaseInformation.name, Neo4jDatabaseInformation);

        /**
         * Create a new driver connection
         *
         * @param  {String}  protocol  Connection protocol.  Supports bolt or bolt+routing
         * @param  {String}  host      Hostname of Neo4j instance
         * @param  {Number}  port      Neo4j Port Number (7876)
         * @param  {String}  username  Neo4j Username
         * @param  {String}  password  Neo4j Password
         * @param  {String}  _database  Neo4j Database (4.0+)
         * @return {Promise}
         * @resolves                   Neo4j driver instance
         */
        const connect = (protocol, host, port, username, password, _database = undefined)  => {
            return new Promise((resolve, reject) => {
                try {
                    const connectionString = `${protocol}://${host}:${port}`;
                    const auth = username && password ? neo4j.auth.basic(username, password) : false;
                    database = _database;

                    if ( username && password ) {
                        driver = new neo4j.driver(connectionString, auth);
                    }
                    else {
                        driver = new neo4j.driver(connectionString);
                    }

                    resolve(driver);
                }
                catch (e) {
                    reject(e);
                }
            });
        }

        /**
         * Get the last instantiated driver instance
         *
         * @return {driver}
         */
        const getDriver = () => {
            if (!driver) {
                throw new Error('A connection has not been made to Neo4j. You will need to run `this.$neo4j.connect(protocol, host, port, username, password)` before you can get the current driver instance');
            }
            return driver;
        }

        /**
         * Create a new driver session
         * @param  {Object} params   Object of parameters
         *
         * @return {driver}
         */
        const getSession = (options = {}) => {
            if (!driver) {
                throw new Error('A connection has not been made to Neo4j. You will need to run `this.$neo4j.connect(protocol, host, port, username, password)` before you can create a new session');
            }

            if ( !options.database ) options.database = database

            return driver.session(options);
        }

        const getDatabase = () => {
            return database;
        }

        const setDatabase = (db) => {
            database = db
        }

        /**
         * Run a query on the current driver
         *
         * @param  {String} cypher   Cypher Query
         * @param  {Object} params   Object of parameters
         * @param  {Object} options  Session options
         * @return {Promise}
         * @resolves                 Neo4j Result Set
         */
        const run = (query, params, options = {}) => {
            const session = getSession(options);

            return session.run(query, params)
                .then(results => {
                    session.close();

                    return results;
                }, err => {
                    session.close();
                    throw err;
                });
        }


        // Desktop Functions

        /**
         * Get the bolt credentials for the current active graph
         * and try to connect.
         *
         * @return {Promise}
         * @resolves            Neo4j driver instance
         */
        const connectToActiveGraph = () => {
            return getActiveBoltCredentials()
                .then(({ host, port, username, password, tlsLevel }) => {
                    const protocol = 'bolt';

                    return connect(protocol, host, port, username, password);
                });
        }


        /**
         * Get the current Neo4h Desktop Context
         *
         * @return {Promise}
         * @resolves Context map of projects, graphs and connections
         */
        const getContext = () => {
            // TODO: Deprecated - will be removed at some undefined point in the future
            if (!window.neo4jDesktopApi) {
                return Promise.reject(new Error('`this.$neo4j.desktop` functions can only be used within Neo4j Desktop'));
            }

            if (context) {
                return Promise.resolve(context);
            }

            return window.neo4jDesktopApi.getContext();
        }

        /**
         * Get the active neo4j desktop graph.  To get the connection details, you can use:
         *  `const { host, port, username, password, enabled, tlsLevel }
         *  = res.connection.configuration.protocols.bolt`
         *
         * @return {Object}   Project object containing `id:String`, `description:String`
         */
        const getActiveGraph = () => {
            return getContext()
                .then(neo4jContext => {
                    const graphs = neo4jContext.projects.reduce((state, project) => {
                        const active = project.graphs.filter(projectGraph => projectGraph.status === 'ACTIVE');
                        return state.concat(active);
                    }, []);

                    return graphs;
                })
                .then(res => {
                    if (!res.length) {
                        throw new Error('There is no active graph.  Click the `Activate` button on a Database in Neoj Desktop and try again.');
                    }

                    graph = res[0];

                    return graph;
                });
        }

        /**
         * Get the bolt credentials current ACTIVE graph
         * @return {Object} Object containing host, port, username, password, enabled, tlsLevel.
         */
        const getActiveBoltCredentials = () => {
            return getActiveGraph()
                .then(current => {
                    if ( current.connection.principals ) {
                        return current.connection.principals.protocols.bolt
                    }

                    // Injected API?
                    return current.connection.configuration.protocols.bolt
                });
        }

        /**
         * Execute a java command in Neo4j Desktop
         * @param  {Object} params
         * @return {Promise}
         */
        const executeJava = (params) => {
            return window.neo4jDesktopApi.requestPermission('backgroundProcess')
                .then(granted => {
                    if (granted) {
                        return window.neo4jDesktopApi.executeJava(params)
                    } else {
                        return Promise.reject('Execute permission denied.');
                    }
                });
        }

        /**
         * Get the current user
         *
         * @return Object
         */
        const getUser = () => {
            return context.me;
        }

        /**
         * Get the Current Projects
         *
         * @return Object
         */
        const getProjects = () => {
            return context.projects;
        }

        /**
         * Get activation keys
         *
         * @return string[]
         */
        const getActivationKeys = () => {
            if ( !context ) return []
            // GraphQL API
            else if ( context.me ) return context.me.activationKeys || []

            // neo4jDesktopApi
            return context.activationKeys || [];
        }


        Vue.$neo4j = Vue.prototype.$neo4j = {
            connect,
            getDriver,
            getSession,
            getDatabase,
            setDatabase,
            run,
            desktop: {
                connectToActiveGraph,
                executeJava,
                getActiveBoltCredentials,
                getActiveGraph,
                getContext,

                getUser,
                getProjects,
                getActivationKeys,
                getGraphQLClient,

                sendMetrics,
            },
        };

        init()
    },
};

export default VueNeo4j;