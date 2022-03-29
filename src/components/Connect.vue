<template>
    <div class="vue-neo4j connect ui middle aligned center aligned grid">
        <div class="loading" v-if="loading"></div>
        <div class="column">
            <slot name="title" />

            <div class="ui form">
                <div class="ui stacked segment left aligned">
                    <slot name="logo" />

                    <div class="ui negative message" v-if="error" v-html="error" />

                    <template v-if="showProjectForm">
                        <div class="form-group field">
                            <label>Project</label>
                            <select class="form-control" v-model="currentProject">
                                <option v-for="p in projects" :key="p.id" :value="p">{{ p.name }} ({{ p.id }})</option>
                            </select>
                        </div>

                        <div class="form-group field" v-if="currentProject">
                            <label>Graph</label>
                            <select class="form-control" v-model="currentGraph">
                                <option  v-for="g in currentProject.graphs" :key="g.name" :value="g">
                                    {{ g.name }} ({{ g.connection.configuration.protocols.bolt.username ? g.connection.configuration.protocols.bolt.username + '@' : '' }}{{ g.connection.configuration.protocols.bolt.host }}:{{ g.connection.configuration.protocols.bolt.port }})
                                </option>
                            </select>
                        </div>

                        <div class="form-group">
                            <button class="ui button primary btn btn-success" :class="{'btn-connect': showActiveButton, fluid: !showActiveButton}" @click.prevent="connect" v-if="currentProject && currentGraph" >Connect</button>
                            <button class="ui button submit btn btn-success btn-connect-active" v-if="showActive" @click.prevent="connectActive">Active Graph</button>
                        </div>

                        <div class="form-group ui aligned">
                            <a class="switch" href="javascript:;" @click.prevent="switchToLoginForm()">
                                Or connect to another graph
                            </a>
                        </div>
                    </template>

                    <template v-else>
                        <div class="fields">
                            <div class="five wide field">
                                <label for="protocol">Protocol</label>
                                <div class="ui left icon input">
                                    <select id="protocol" v-model="iprotocol">
                                        <option v-for="p in protocols" :key="p" :selected="iprotocol == p" :value="p" v-html="p" />
                                    </select>
                                </div>
                            </div>
                            <div class="seven wide field">
                                <label for="host">Host</label>
                                <div class="ui left icon input">
                                    <i class="server icon"></i>
                                    <input type="text" id="host" name="host" placeholder="Host" v-model="ihost">
                                </div>
                            </div>
                            <div class="six wide field">
                                <label for="server">Port</label>
                                <div class="ui left icon input">
                                    <i class="circle outline icon"></i>
                                    <input type="number" id="port" name="port" placeholder="Port" v-model="iport">
                                </div>
                            </div>
                        </div>
                        <div class="field" v-if="showDatabase">
                            <label for="database">Database</label>
                            <div class="ui left icon input">
                                <i class="database icon"></i>
                                <input type="text" id="database" name="database" placeholder="Default (dbms.default_database)" v-model="idatabase">
                            </div>
                        </div>
                        <div class="field">
                            <label for="username">Username</label>
                            <div class="ui left icon input">
                                <i class="user icon"></i>
                                <input type="text" id="username" name="username" placeholder="Username" v-model="iusername">
                            </div>
                        </div>
                        <div class="field">
                            <label for="password">Password</label>
                            <div class="ui left icon input">
                                <i class="lock icon"></i>
                                <input type="password" name="password" placeholder="Password" v-model="ipassword">
                            </div>
                        </div>
                        <div class="form-group">
                            <button class="fluid ui button primary submit btn btn-success" @click.prevent="connectToOtherGraph">Connect</button>
                        </div>
                    </template>
                    <slot name="details" />
                </div>
            </div>

            <slot name="footer" />
        </div>
    </div>
</template>

<style>
.vue-neo4j.connect {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.vue-neo4j.connect .column {
    width: 100% !important;
    max-width: 420px  !important;
}
.vue-neo4j.connect .ui.form select {
    height: 38px;
}
.vue-neo4j.connect .ui.form  .switch {
    display: block;
    padding: 12px 0 0;
   text-align: center;
}
.btn-connect {width: 55% !important; float: right;}
.btn-connect-active {width: 40% !important; float: left;}
.form-group:after {
    clear: both;
    content: "";
    display: block;
}
</style>

<script>
export default {
    name: 'neo4j-connect',
    props: {
        onConnect: {
            type: Function,
            default: () => {},
        },
        onConnectError: {
            type: Function,
            default: e => console.error(e), // eslint-disable-line no-console
        },
        /**
         * Show a button to connect to the current active graph?
         */
        showActive: {
            type: Boolean,
            default: true,
        },

        showDatabase: {
            type: Boolean,
            default: true,
        },

        showProjects: {
            type: Boolean,
            default: true,
        },

        protocol: {
            type: String,
            default: 'neo4j',
        },
        host: {
            type: String,
            default: 'localhost',
        },
        port: {
            type: [Number, String],
            default: 7687,
        },
        database: {
            type: String,
            default: '',
        },
        username: {
            type: String,
            default: 'neo4j',
        },
        password: {
            type: String,
            default: '',
        },
    },
    mounted() {
        const params = new URLSearchParams(window.location.href)

        let full, protocol_, urlProtocol, urlHost, port_, urlPort

        if ( params.has('url') ) {
            [ full, protocol_, urlProtocol, urlHost, port_, urlPort ] = url.match(/((neo4j|neo4j\+s|neo4j\+ssc|bolt|bolt\+s|bolt\+ssc):\/\/)([a-z0-9\.]+)(:([0-9]+))/)

        }


        this.iprotocol = this.protocol || urlProtocol
        this.ihost = this.host || urlHost
        this.iport = this.port || urlPort
        this.idatabase = this.database || params.get('database')
        this.iusername = this.username || params.get('user')
        this.ipassword = this.password || params.get('pass')

        // TODO: Handle GraphQL API
        this.showProjectForm = this.showProjects && window.neo4jDesktopApi

        if ( this.showProjectForm ) {
            this.$neo4j.desktop.getContext()
                .then(context => {
                    this.projects = context.projects.map(project => {
                        const { id, name, graphs } = project

                        return { id, name, graphs }
                    })
                })
                .then(() => {
                    this.$neo4j.desktop.getActiveGraph()
                        .then(graph => this.activeGraph = graph)
                })
                .then(() => {
                    this.loading = false
                })
        }
        else if ( urlProtocol && urlHost && urlPort && this.iusername && this.ipassword ) {
            this.connectToOtherGraph()
        }
    },
    data: () => ({
        protocols: ['neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc'],
        iprotocol: '',
        ihost: '',
        iport: 7687,
        idatabase: '',
        iusername: 'neo4j',
        ipassword: '',

        showProjectForm: true,
        activeGraph: false,
        connections: {},
        currentGraph: false,
        currentProject: false,
        loading: true,
        error: false,
        projects: {},
    }),
    methods: {
        connectActive() {
            this.loading = true

            this.$neo4j.desktop.connectToActiveGraph()
                .then(driver => driver.verifyConnectivity().then(() => driver))
                .then(driver => this.onConnect(driver))
                .catch(error => {
                    this.error = error.message

                    this.onConnectError(error)
                })
                .then(() => {
                    this.loading = false
                })
        },
        connect() {
            this.loading = true
            this.error = false

            const {
                host,
                port,
                username,
                password,
                tlsLevel,
            } = this.currentGraph.connection.configuration.protocols.bolt;

            const protocol = 'neo4j';

            this.$neo4j.connect(protocol, host, port, username, password)
                .then(driver => driver.verifyConnectivity().then(() => driver))
                .then(driver => this.onConnect(driver))
                .catch(error => {
                    this.error = error.message

                    this.onConnectError(error)
                })
                .then(() => {
                    this.loading = false
                })
        },

        connectToOtherGraph() {
            const { iprotocol, ihost, iport, iusername, ipassword, idatabase } = this

            this.$neo4j.connect(iprotocol, ihost, iport, iusername, ipassword, idatabase !== '' ? idatabase : undefined)
                .then(driver => driver.verifyConnectivity().then(() => driver))
                .then(driver => this.onConnect(driver))
                .catch(error => {
                    this.error = error.message

                    this.onConnectError(error)
                })
                .then(() => {
                    this.loading = false
                })
        },
        switchToLoginForm() {
            this.showProjectForm = false
        },
    },
    computed: {
        showActiveButton() {
            return this.showActive && this.activeGraph
        }
    },
}
</script>
