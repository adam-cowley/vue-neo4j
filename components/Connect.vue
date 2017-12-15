<template>
    <div class="vue-neo4j connect">
        <div class="loading" v-if="loading"></div>
        <div class="container">
            <div class="card">
                <div class="form-group">
                    <label>Project</label>
                    <select class="form-control" v-model="currentProject">
                        <option v-for="p in projects" v-bind:value="p">{{ p.name }} ({{ p.id }})</option>
                    </select>
                </div>

                <div class="form-group" v-if="currentProject">
                    <label>Graph</label>
                    <select class="form-control" v-model="currentGraph">
                        <option  v-for="g in currentProject.graphs" v-bind:value="g">
                            {{ g.name }} ({{ g.connection.configuration.protocols.bolt.username ? g.connection.configuration.protocols.bolt.username + '@' : '' }}{{ g.connection.configuration.protocols.bolt.host }}:{{ g.connection.configuration.protocols.bolt.port }})
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <button class="btn btn-primary btn-connect" v-on:click="connect()" v-if="currentProject && currentGraph" >Connect</button>
                    <button class="btn btn-success btn-connect-active" v-on:click="connectActive()">Active</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.btn-connect {width: 60% !important; float: left;}
.btn-connect-active {width: 35% !important; float: right;}
.form-group:after {
    clear: both;
    content: "";
    display: block;
}
</style>

<script>
export default {
    name: 'Connect',
    props: {
        onConnect: {
            type: Function,
            default: () => {},
        },
        onConnectError: {
            type: Function,
            default: console.log, // eslint-disable-line no-console
        },
    },
    mounted() {
        return this.$neo4j.desktop.getContext()
            .then(context => {
                this.projects = context.projects.map(project => {
                    const { id, name, graphs } = project;

                    return { id, name, graphs };
                });
            })
            .then(() => {
                this.loading = false;
            });
    },
    data() {
        return {
            connections: {},
            currentGraph: false,
            currentProject: false,
            loading: true,
            projects: {},
        };
    },
    methods: {
        connectActive() {
            this.loading = true;

            this.$neo4j.desktop.connectToActiveGraph()
                .then(driver => {
                    this.onConnect(driver);
                })
                .catch(this.onConnectError)
                .then(() => {
                    this.loading = false;
                });
        },
        connect() {
            this.loading = true;

            const {
                host,
                port,
                username,
                password,
                tlsLevel,
            } = this.currentGraph.connection.configuration.protocols.bolt;

            const protocol = 'bolt';
            const encrypted = tlsLevel !== 'OPTIONAL';

            this.$neo4j.connect(protocol, host, port, username, password, encrypted)
                .then(driver => {
                    this.onConnect(driver);
                })
                .catch(this.onConnectError)
                .then(() => {
                    this.loading = false;
                });
        },
    },
};
</script>
