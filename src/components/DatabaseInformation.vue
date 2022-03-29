<template>
    <div class="neo4j-database" @click="toggleSwitch">
        <div class="ui vertical menu">
            <div class="item">
                <div class="header current-database">
                    {{host}}:{{port}}
                </div>
                <div class="menu">
                    <div class="item">
                        {{ database || '(default)' }}

                        <i class="spinner icon" v-if="loading"></i>
                        <i :class="closeIcon" class="icon" v-else-if="switchVisible"></i>
                        <i :class="openIcon" class="icon" v-else-if="cleanedDatabases.length > 1"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="ui vertical pointing menu databases" v-if="switchVisible">
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
            if ( this.cleanedDatabases.length < 2 ) return

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
.neo4j-database {
    position: relative;
}
.neo4j-database .current-database {
    border-bottom: 0px none !important;
}

.neo4j-database .databases {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
}
</style>