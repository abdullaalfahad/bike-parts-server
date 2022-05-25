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

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.send(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const userCollection = client.db('manufacture').collection('users');
        const toolCollection = client.db('manufacture').collection('tools');
        const reviewCollection = client.db('manufacture').collection('reviews');
        const orderCollection = client.db('manufacture').collection('orders');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        }

        // user api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.send({ result, token });
        })

        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }
        })

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        })

        // reviews api 
        app.get('/reviews', async (req, res) => {
            const cursor = await reviewCollection.find().toArray();
            res.send(cursor);
        })

        app.post('/reviews', verifyJWT, async (req, res) => {
            const item = req.body;
            const result = await reviewCollection.insertOne(item);
            res.send(result);
        })

        // tools api
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

        app.post('/tools', verifyJWT, verifyAdmin, async (req, res) => {
            const tool = req.body;
            const result = await toolCollection.insertOne(tool);
            res.send(result);
        })

        app.get('/tool', verifyJWT, verifyAdmin, async (req, res) => {
            const tool = await toolCollection.find().toArray();
            res.send(tool);
        })

        app.delete('/tool/:_id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id) };
            const result = await toolCollection.deleteOne(filter);
            res.send(result);
        })

        // orders api 
        app.post('/orders', async (req, res) => {
            const item = req.body;
            const result = await orderCollection.insertOne(item);
            res.send(result);
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const order = await orderCollection.find(query).toArray();
                res.send(order);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }
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