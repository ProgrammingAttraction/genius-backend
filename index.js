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
        origin:["http://localhost:5173"], // Specify the allowed origin
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
    res.send("hello oracle-soft backend part!")
})


app.post('/send-notification-to-topic', async (req, res) => {
    const { topic, title, body } = req.body;

    const message = {
        notification: {
            title: title,
            body: body,
        },
        topic: topic,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Error sending notification');
    }
}
);
app.post('/send-notification-to-multiple-topics', async (req, res) => {
    const { topics, title, body } = req.body;

    const message = {
        notification: {
            title: title,
            body: body,
        },
        topics: topics,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Error sending notification');
    }
}
);
app.post('/send-notification-to-multiple-devices', async (req, res) => {
    const { tokens, title, body } = req.body;

    const message = {
        notification: {
            title: title,
            body: body,
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log('Notification sent successfully:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Error sending notification');
    }
}
);
app.post('/send-notification-to-device', async (req, res) => {
    const { token, title, body } = req.body;

    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: token,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Error sending notification');
    }
}
);
app.post('/send-notification-to-multiple-devices', async (req, res) => {
    const { tokens, title, body } = req.body;

    const message = {
        notification: {
            title: title,
            body: body,
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log('Notification sent successfully:', response);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Error sending notification');
    }
}
);



app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})