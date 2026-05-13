import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const database = client.db('lexicard_db');
    const collection = database.collection('cards');

    if (req.method === 'GET') {
      const cards = await collection.find({}).toArray();
      return res.status(200).json(cards);
    }

    if (req.method === 'POST') {
      const newCard = req.body;
      const result = await collection.insertOne(newCard);
      return res.status(201).json({ ...newCard, _id: result.insertedId });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ message: 'Deleted' });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { learned } = req.body;
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { learned } }
      );
      return res.status(200).json({ message: 'Updated' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // We don't close the client in serverless to reuse connections
  }
}
