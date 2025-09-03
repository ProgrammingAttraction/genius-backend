const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const AuthRouter = require('./Routes/AuthRouter');
const Adminrouter = require('./Routes/Adminrouter');
const  admin=require("firebase-admin")
const path=require("path")
require('dotenv').config();
require('./Models/db');
const PORT = process.env.PORT || 8080;

app.get('/ping', (req, res) => {
    res.send('PONG');
});

app.use(bodyParser.json());
app.use(express.urlencoded())
app.use(cors(
    {
        origin:[
        "http://localhost:5173",
        "https://genius.arbeittechnology.com",
        "https://genius-school.arbeittechnology.com"
        ], // Specify the allowed origin
        methods: ["GET", "POST", "PUT", "DELETE","PATCH","OPTIONS"], // Specify allowed methods
        allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
        credentials: true, // Allow credentials (cookies, etc.)
        optionsSuccessStatus:200,
      }
));
app.use(express.static("public"))
app.use('/auth', AuthRouter);
app.use('/api/admin', Adminrouter);
app.get("/",(req,res)=>{
    res.send("hello backend part!")
})



app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})