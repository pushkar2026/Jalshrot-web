
const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

// Reuse connection cache across serverless invocations
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null,
    };
}

const connectDB = async () => {

    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGO_URI or MONGODB_URI is missing");
    }

    // Return existing connection
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // Create connection only if one is not already in progress
    if (!cached.promise) {

        const hasDatabase =
            /^mongodb(?:\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);

        const options = {
            serverSelectionTimeoutMS: 10000,
            ...(hasDatabase
                ? {}
                : { dbName: process.env.MONGO_DB || "jalsrot" }),
        };

        cached.promise = mongoose
            .connect(uri, options)
            .then((mongooseInstance) => {
                console.log(
                    `MongoDB Connected (${mongooseInstance.connection.name})`
                );

                return mongooseInstance;
            })
            .catch((error) => {
                cached.promise = null;
                throw error;
            });
    }

    cached.conn = await cached.promise;

    return cached.conn;
};

module.exports = connectDB;
