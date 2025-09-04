import dotenv from "dotenv";
import connectDB from "./db/index.js";   
import app from "./app.js";

dotenv.config({ path: "./.env" });      

console.log("🚀 App starting...");

connectDB()
.then(()=>{
    app.listen(process.env.PORT, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((err)=>{
    console.log("Error in DB connection", err)
});