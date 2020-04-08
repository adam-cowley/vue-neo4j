# vue-neo4j

A Vue.js plugin that allows you to connect directly to Neo4j inside the browser using the bolt protocol.


## Installation

vue-neo4j can be installed via npm.

```javascript
npm install --save vue-neo4j
```

Once installed, Import or require the plugin into your project and use `Vue.use` to register the plugin.

```javascript
import Vue from 'Vue'
import VueNeo4j from 'vue-neo4j'

Vue.use(VueNeo4j)
```

## Usage

Once installed, a `$neo4j` property will be added to all Vue components.

```html
<template>
  <div>
    <input v-model="protocol">
    <input v-model="host">
    <input v-model="port">
    <input v-model="username">
    <input v-model="password">
    <button @click="connect()">Connect</button>
  </div>
</template>

<script>
export default {
    name: 'MyComponent',
    data() {
        return {
            protocol: 'bolt',
            host: 'localhost',
            port: 7687,
            username: 'neo4j',
            password: 'trustno1'
        }
    },
    methods: {
        connect() {
           return this.$neo4j.connect(this.protocol, this.host, this.port, this.username, this.password)
        },
        driver() {
            // Get a driver instance
            return this.$neo4j.getDriver()
        },
        testQuery() {
            // Get a session from the driver
            const session = this.$neo4j.getSession()

            session.run('MATCH (n) RETURN count(n) AS count')
                .then(res => {
                    console.log(res.records[0].get('count'))
                })
                .then(() => {
                    session.close()
                })
        }
    }
};
```

### `this.$neo4j.connect()`

Param | Type |  Description
-- | -- | --
String | protocol | Connection protocol.  Supports bolt or bolt+routing
String | host     | Hostname of Neo4j instance
Number | port     | Neo4j Port Number (7876)
String | username | Neo4j Username
String | password | Neo4j Password
Boolean | encrypted | Force an encrypted connection?

Returns a `Promise`.  Resolves to an instance of the Neo4j driver.

### `this.$neo4j.getDriver()`

Returns the last connected driver instance.  This method will throw an error if no connection has been made.

### `this.$neo4j.getSession()`

Returns the new session from the driver.  This method will throw an error if no connection has been made.

### `this.$neo4j.run(cypher, params)`

Creates a new session in the current driver, runs the query, closes the session and returns the Neo4j result object in one go.

```javascript
{
    name: 'Profile',
    data() {
        return {
            username: 'adam',
            user: false
        };
    },
    methods: {
        getUser() {
            const query = 'MATCH (u:User { username: $username }) RETURN u LIMIT 1'
            const params = { username: this.username };

            this.$neo4j.run(query, params)
                .then(res => {
                    const user = res.records[0].get('u');
                    this.user = user;
                });
        }
    }
}
```

## Neo4j Desktop

This plugin contains some handy functions for integrating with Neo4j Desktop.  The `this.$neo4j.desktop` provides helpers for getting the context, active graph configuration/credentials and a function to connect directly to the active graph.

- connectToActiveGraph
- executeJava
- getActiveBoltCredentials
- getActiveGraph
- getContext


### `this.$neo4j.desktop.connectToActiveGraph()`

Connect to the active graph started in Desktop.

```javascript
this.$neo4j.desktop.connectToActiveGraph()
    .then(driver => {
        this.onConnect(driver);
    });
```

### Connect Form Component

The Connect component will pull all projects and graphs from the Desktop context and allow. you to choose which project and graph to connect to.  The `onConnect` and `onConnectError` functions will be trigged on successful connection or when a connection error is thrown.  This will allow you to set the current state.  The `showActive` button allows you to show or hide the 'Active', which when clicked will search for an active graph and attempt to connect.

The form elements are styled with Bootstrap classes.  You can target the elements within the form by using the `.vue-neo4j.connect` class which is applied to the parent.

```html
<template>
    <VueNeo4jConnect
        :onConnect="myOnConnect"
        :onConnectError="myOnConnectError"
        :showActive="true" />
</template>

<script>
export default {
    name: 'MyComponent',
    methods: {
        myOnConnect(driver) {
            console.log('Connected!')
            console.log(driver)
        },
        myOnConnectError(error) {
            console.error(error)
        }
    }
};
</script>

<style>
.vue-neo4j.connect {
    background: blue;
}
</style>
```

#### Component Props

| Prop | Type | Description | Default |
| --- | --- | --- | --- |
|  onConnect | `Function` | Callback function for when a driver connection has been made | `() => {}`
| onConnectError | `Function` | Callback function for when there is a problem connecting with the supplied credentials | `e => console.error(e)`
| showActive | `Boolean` | Show a button to connect to the current active graph? |  `true`
| showProjects | `Boolean` | Show the list of projects rather than a form with host, port, username etc. | `true`
| protocol | `String` | The default protocol to display in the connect form | `'neo4j'`
| host | `String` | The default host to display in the connect form | `'localhost'`
| port: | ` [Number, String]` | The default port to display in the connect form | `7687`
| database | ` String` | The default database to display in the connect form | `''`
| username | ` String` | The default username to display in the connect form |`'neo4j'`
| password | ` String` | The default password to display in the connect form | `''`



