import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    // Use the default database from the connection string
    const database = client.db();
    const collection = database.collection('flashcards');

    if (req.method === 'GET') {
      const cards = await collection.find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json(cards);
    }

    if (req.method === 'POST') {
      const { term, definition } = req.body;
      
      // Check for duplicates (case-insensitive)
      const existingCard = await collection.findOne({ 
        term: { $regex: new RegExp(`^${term.trim()}$`, 'i') } 
      });

      if (existingCard) {
        return res.status(200).json(existingCard);
      }

      const newCard = { 
        term: term.trim(), 
        definition, 
        learned: false, 
        created_at: new Date() 
      };
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
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
