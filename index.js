const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port =process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ntnzcww.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("bistroBoss");
    const menuCollection = database.collection("menu");
    const reviwesCollection = database.collection("reviwes");
    const cartCollection = database.collection("cart");


    // get the menu data
app.get('/menu', async(req,res) =>{
    const cursor = menuCollection.find();
    const result = await cursor.toArray()
    res.send(result)
})
// get the reviwes data
app.get('/reviwes', async(req,res) =>{
    const cursor = reviwesCollection.find();
    const result = await cursor.toArray();
    res.send(result)
})


// add to cart
app.post('/cart', async(req,res) =>{
  const cartItem = req.body;
  const existingCartItem = await cartCollection.findOne({
    menuId: cartItem.menuId,
    email: cartItem.email,
  });

  if (existingCartItem) {
    // Item already exists, you can choose to update the existing item or ignore the request
    res.status(400).send({ error: 'Item already in the cart' });
  } else {
    const result = await cartCollection.insertOne(cartItem);
    res.send(result);
  }

})
// get the cart data
app.get('/cart', async(req,res) =>{
  const email = req.query.email;
 const query ={email: email}
  const cursor = cartCollection.find(query);
  const result = await cursor.toArray();
  res.send(result)
})











    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})