const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pk2nl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db('manufacture').collection('tools');
        const reviewCollection = client.db('manufacture').collection('reviews');
        const orderCollection = client.db('manufacture').collection('orders');

        app.get('/reviews', async (req, res) => {
            const cursor = await reviewCollection.find().toArray();
            res.send(cursor);
        })

        app.get('/tools', async (req, res) => {
            const cursor = await toolCollection.find().toArray();
            res.send(cursor);
        })

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolCollection.findOne(query);
            res.send(tool);
        })

        app.put('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const updated = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    available: updated.available
                }
            }
            const result = await toolCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.post('/order', async (req, res) => {
            const item = req.body;
            const result = await orderCollection.insertOne(item);
            res.send(result);
        })

    }

    finally { }

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from server side')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})