/* eslint-disable new-cap, no-param-reassign, no-unreachable, no-multi-assign */
import VueNeo4jConnect from './components/Connect.vue';

const neo4j = require('neo4j-driver/lib/browser/neo4j-web.min.js').v1;

export default {
    install: Vue => {
        let driver;
        let context;
        let graph;

        Vue.component(VueNeo4jConnect.name, VueNeo4jConnect);

        /**
         * Get the current Neo4h Desktop Context
         *
         * @return {Promise}
         * @resolves Context map of projects, graphs and connections
         */
        function getContext() {
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
        function getActiveGraph() {
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
        function getActiveBoltCredentials() {
            return getActiveGraph()
                .then(current => current.connection.configuration.protocols.bolt);
        }

        /**
         * Execute a java command in Neo4j Desktop
         * @param  {Object} params
         * @return {Promise}
         */
        function executeJava(params) {
            return window.neo4jDesktopApi.executeJava(params);
        }

        /**
         * Create a new driver connection
         *
         * @param  {String}  protocol  Connection protocol.  Supports bolt or bolt+routing
         * @param  {String}  host      Hostname of Neo4j instance
         * @param  {Number}  port      Neo4j Port Number (7876)
         * @param  {String}  username  Neo4j Username
         * @param  {String}  password  Neo4j Password
         * @param  {Boolean} encrypted Force an encrypted connection?
         * @return {Promise}
         * @resolves                   Neo4j driver instance
         */
        function connect(protocol, host, port, username, password, encrypted = true) {
            return new Promise((resolve, reject) => {
                try {
                    const connectionString = `${protocol}://${host}:${port}`;
                    const auth = username && password ? neo4j.auth.basic(username, password) : null;

                    driver = new neo4j.driver(connectionString, auth, { encrypted });

                    resolve(driver);
                }
                catch (e) {
                    reject(e);
                }
            });
        }

        /**
         * Get the bolt credentials for the current active graph
         * and try to connect.
         *
         * @return {Promise}
         * @resolves            Neo4j driver instance
         */
        function connectToActiveGraph() {
            return getActiveBoltCredentials()
                .then(({ host, port, username, password, tlsLevel }) => {
                    const protocol = 'bolt';
                    const encrypted = tlsLevel !== 'OPTIONAL';

                    return connect(protocol, host, port, username, password, encrypted);
                });
        }

        /**
         * Get the last instantiated driver instance
         *
         * @return {driver}
         */
        function getDriver() {
            if (!driver) {
                throw new Error('A connection has not been made to Neo4j. You will need to run `this.$neo4j.connect(protocol, host, port, username, password)` before you can get the current driver instance');
            }
            return driver;
        }

        /**
         * Create a new driver session
         *
         * @return {driver}
         */
        function getSession() {
            if (!driver) {
                throw new Error('A connection has not been made to Neo4j. You will need to run `this.$neo4j.connect(protocol, host, port, username, password)` before you can create a new session');
            }

            return driver.session();
        }

        /**
         * Run a query on the current driver
         *
         * @param  {String} cypher Cypher Query
         * @param  {Object} params Object of parameters
         * @return {Promise}
         * @resolves                   Neo4j Result Set
         */
        function query(cypher, params) {
            const session = getSession();

            return session.run(query, params)
                .then(results => {
                    session.close();

                    return results;
                }, err => {
                    session.close();
                    throw err;
                });
        }

        Vue.$neo4j = Vue.prototype.$neo4j = {
            connect,
            getDriver,
            getSession,
            query,
            desktop: {
                connectToActiveGraph,
                executeJava,
                getActiveBoltCredentials,
                getActiveGraph,
                getContext,
            },
        };
    },
};
