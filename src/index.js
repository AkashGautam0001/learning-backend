// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";

import { app } from "./app.js";

dotenv.config({
    path: "./.env",
});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is runnig at port : ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!", err);
    });

//first approach
// Always wrap database try catch and async-await
/*
import express from "express";
const app = express();

(async () => {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
        console.log("ERROR : server start", error);
        throw error;
    });

    app.listen(process.env.PORT, () => {
        console.log("App is listening on ", process.env.PORT);
    });

    try {
    } catch (error) {
        console.error("ERROR : Database Connection", error);
        throw err;
    }
})();

*/
