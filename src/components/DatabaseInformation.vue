<template>
    <div class="neo4j-database ui inverted menu" @click="toggleSwitch">
        <div class="ui vertical inverted menu floated right">
            <div class="item">
                <div class="header">
                    {{host}}:{{port}}
                </div>
                <div class="menu">
                    <div class="item">
                        {{ database || '(default)' }}

                        <i class="spinner icon" v-if="loading"></i>
                        <i :class="closeIcon" class="icon" v-else-if="switchVisible"></i>
                        <i :class="openIcon" class="icon" v-else></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="ui inverted vertical pointing menu" v-if="switchVisible">
            <a
                class="item"
                v-for="database in cleanedDatabases"
                :key="database.name"
                @click.prevent="switchTo(database)"
            >
                {{ database.name }}
                <span v-if="database.default">(default)</span>
            </a>
        </div>
    </div>
</template>

<script>
export default {
    name: 'neo4j-database-information',
    props: {
        allowChangeToSystem: {
            type: Boolean,
            default: false,
        },
        onDatabaseChange: {
            type: Function,
            default: () => {},
        },

        closeIcon: {
            type: String,
            default: 'angle up'
        },
        openIcon: {
            type: String,
            default: 'angle down'
        },
    },
    data: () => ({
        loading: true,
        databases: [],
        switchVisible: false,
        database: '',
    }),
    mounted() {
        this.loadDatabases()
    },
    methods: {
        loadDatabases() {
            this.database = this.$neo4j.getDatabase()
            this.$neo4j.run(`SHOW DATABASES`, {}, {database: 'system'})
                .then(res => {
                    this.databases = res.records.map(row => Object.fromEntries( row.keys.map(key => [ key, row.get(key) ]) ) )

                    this.loading = false
                })

        },
        toggleSwitch() {
            this.switchVisible = !this.switchVisible
        },
        switchTo(database) {
            this.$neo4j.setDatabase(database.name)
            this.database = this.$neo4j.getDatabase()

            this.onDatabaseChange(database)
        },
    },
    computed: {
        cleanedDatabases() {
            return this.databases.filter(database => this.allowChangeToSystem || database.name !== 'system')
        },
        credentials() {
            return this.$neo4j.getDriver()
        },
        host() {
            return this.credentials._address._host
        },
        port() {
            return this.credentials._address._port
        },
        username() {
            return this.credentials._authToken.principal
        },
    },
}
</script>

<style>
.neo4j-database .pointing.menu {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    background: rgba(0,0,0,.8);
    position: absolute;
    bottom: 100%;
    right: 0;
}
</style>