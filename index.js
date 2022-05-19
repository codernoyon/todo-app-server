const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();

// midleware
app.use(cors());
app.use(express.json());


function verifyJwT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
    })


}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ha8ug.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const todoCollection = client.db("todoApp").collection("todo");
        const userCollection = client.db("todoApp").collection("user");

        app.post('/add', async(req, res) => {
            const newTodo = req.body;
            const result = await todoCollection.insertOne(newTodo);
            res.send({success: true, result});
        });

        app.put("/user/:email", async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token, result });
        });

        app.get('/todo', verifyJwT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const todos = await todoCollection.find(query).toArray();
                res.send({ success: true, data: todos });
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }

        });

        app.delete('/todo/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await todoCollection.deleteOne(query);
            res.send({success: true, message: "Deleted Succesfully", result});

        });
    }
    finally {

    }

}

run().catch(console.dir);

// testing server
app.get('/', (req, res) => {
    res.send({ message: "Todo app server is runnig now!!" })

});

app.listen(port, () => {
    console.log("Listening port", port);
})