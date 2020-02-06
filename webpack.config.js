module.exports = {
    entry: './src/index.js',
    output: {
        path: __dirname + '/dist',
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            // {
            //     test: /\.js$/,
            //     loader: 'babel-loader',
            //     exclude: /node_modules/
            // },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            }
        ]
    }
};