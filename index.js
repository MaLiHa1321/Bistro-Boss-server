const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const app = express()
const port =process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    // await client.connect();

    const database = client.db("bistroBoss");
    const menuCollection = database.collection("menu");
    const usersCollection = database.collection("users");
    const reviwesCollection = database.collection("reviwes");
    const cartCollection = database.collection("cart");
    const paymentCollection = database.collection("payment");




// middelwares 
const verifyToken = (req,res,next) =>{
  console.log('inside verifyr',req.headers.authorization);
  if(!req?.headers?.authorization){
    return res.status(401).send({message: 'forbidden access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err){
       return res.status(401).send({message: 'forbidden access'})

    }
    req.decoded = decoded;
    next();
  })

 
}
// use veify admin after verify token
const verifyAdmin = async( req,res,next) =>{
const email = req.decoded.email;
const query ={email: email};
const user = await usersCollection.findOne(query);
const isAdmin = user?.role === 'admin';
if(!isAdmin){
  return res.status(403).send({message: 'fobidden access'})
}
next();
}

// get user
app.get('/users', verifyToken, verifyAdmin, async(req,res) =>{
  console.log(req.headers)
  const result = await usersCollection.find().toArray();
  res.send(result)
})

// admin check
app.get('/users/admin/:email', verifyToken, async(req,res) =>{
  const email = req.params.email;
  if(email !== req.decoded.email){
    return res.status(403).send({message: 'unauthrorized access'})
  }
  const query ={email: email};
  const user = await usersCollection.findOne(query);
let admin = false;
if(user){
  admin = user?.role === 'admin';
} 
res.send({admin})
})

// delete user
app.delete('/users/:id', async(req,res) =>{
  const id = req.params.id;
  const query = { _id: new ObjectId(id)}
  const result = await usersCollection.deleteOne(query)
  res.send(result)
})

// menu post
app.post('/menu',verifyToken, verifyAdmin, async(req,res) =>{
  const item = req.body;
  const result = await menuCollection.insertOne(item)
  res.send(result)
})

    // get the menu data
app.get('/menu', async(req,res) =>{
    const cursor = menuCollection.find();
    const result = await cursor.toArray()
    res.send(result)
})

// delete menu
app.delete('/menu/:id', verifyToken, verifyAdmin, async(req,res) =>{
  const id =req.params.id;
  const query ={_id: new ObjectId(id)}
  const result = await menuCollection.deleteOne(query);
  res.send(result)
})

// update item
app.get('/menu/:id', async(req,res) =>{
  const id = req.params.id;
  const query ={ _id: new ObjectId(id)}
  const result = await menuCollection.findOne(query)
  res.send(result)
})

app.patch('/menu/:id', async(req,res) =>{
  const item = req.body;
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)}
  const updatedDoc ={
    $set: {
      name: item.name,
      category: item.category,
      price: item.recipe,
      image: item.image
    }
  }
  const result = await menuCollection.updateOne(filter,updatedDoc)
  res.send(result)
})

// get the reviwes data
app.get('/reviwes', async(req,res) =>{
    const cursor = reviwesCollection.find();
    const result = await cursor.toArray();
    res.send(result)
})

    // user post
app.post('/users', async(req,res) =>{
   const user = req.body;
   const query = {email: user.email}
   const existingUser = await usersCollection.findOne(query)
   if(existingUser){
    return res.send({message: 'user already exists', insertedId: null})
   }
   const result = await usersCollection.insertOne(user)
   res.send(result)
})

// role make
app.patch('/user/admin/:id', verifyToken, verifyAdmin, async(req,res) =>{
  const id = req.params.id;
  const filter = { _id: new ObjectId(id)}
  const updatedDoc = {
    $set: {
      role: 'admin'
    }
  }
  const result = await usersCollection.updateOne(filter,updatedDoc)
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
   return res.send({ error: 'Item already in the cart' });
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

// delete cart item
app.delete('/cart/:id', verifyToken, verifyAdmin, async(req,res) =>{
    const id =req.params.id;
    const query ={_id: new ObjectId(id)}
    const result = await cartCollection.deleteOne(query);
    res.send(result)
})

// payment intent
app.post('/create-payment-intent', async(req,res) =>{
  const {price} = req.body;
  const amount = parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

// get the payment data
app.get('/payments/:email', verifyToken, async(req,res) =>{
  const query = {email: req.params.email}
  if(req.params.email !== req.decoded.email){
    return res.status(403).send({message: 'forbidden access'})
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result)
})

// payment related api
app.post('/payments', async(req,res) =>{
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment)

  // delete each item from the cart
  console.log('payment info', paymentResult)
  const query ={_id: {
    $in: payment.cartIds.map(id => new ObjectId(id))
  }};

  const deleteResult = await cartCollection.deleteMany(query)
  res.send({paymentResult, deleteResult})


})

// jwt 
app.post('/jwt', async(req,res) =>{
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '10h'})
  res.send({token})
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