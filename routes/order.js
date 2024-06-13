import { Router } from 'express';
import nedb from 'nedb-promises';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



const menuDB = new nedb({ filename: 'airbean.db', autoload: true });
const router = Router();



// Middleware för autentisering och admin-kontroll
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const checkAdminRole = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.sendStatus(403);
  }
  next();
};

// Inloggningsrutt
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await userDB.findOne({ username });

  if (!user) return res.status(400).json({ message: 'Användare inte hittad' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).json({ message: 'Ogiltigt lösenord' });

  const token = jwt.sign({ username: user.username, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });
  res.json({ token });
});



// Kampanjrelaterad kod
async function validateProducts(productIds) {
  const products = await menuDB.find({ id: { $in: productIds } });
  return products.length === productIds.length;
}

router.post('/campaigns', authenticateToken, checkAdminRole, async (req, res) => {
  const { productIds, price } = req.body;

  const validProducts = await validateProducts(productIds);
  if (!validProducts) {
    return res.status(400).send('En eller flera produkter finns inte');
  }

  const newCampaign = { productIds, price };
  await menuDB.insert(newCampaign);
  res.status(201).send('Kampanj tillagd!');
});



// Route to get all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await menuDB.find({});
    console.log("All menu items:", menuItems);
    res.json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).send("Internal Server Error");
  }
});



// Route to add a new menu item
router.post('/', async (req, res) => {
  const { id, title, desc, price } = req.body;

  if (!id || !title || !desc || !price) {
    return res.status(400).json({ message: 'Alla egenskaper måste finnas med (id, title, desc, price)' });
  }

  const newProduct = {
    id,
    title,
    desc,
    price,
    createdAt: new Date().toISOString(),
  };

  try {
    const insertedProduct = await menuDB.insert(newProduct);
    res.status(201).json({ message: 'Produkt tillagd', product: insertedProduct });
  } catch (error) {
    console.error("Error adding new product:", error);
    res.status(500).send("Internal Server Error");
  }
});



// Route to update a menu item by id
router.put('/:id', async (req, res) => {
  const itemId = req.params.id;
  const updatedData = req.body;
  updatedData.modifiedAt = new Date().toISOString();

  try {
    const updatedProduct = await menuDB.update({ _id: itemId }, { $set: updatedData }, { returnUpdatedDocs: true });
    if (updatedProduct) {
      res.json({ message: 'Produkt uppdaterad', product: updatedProduct });
    } else {
      res.status(404).send("Menu item not found");
    }
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).send("Internal Server Error");
  }
});



// Route to delete a menu item by id
router.delete('/:id', async (req, res) => {
  const itemId = req.params.id;

  try {
    const numRemoved = await menuDB.remove({ _id: itemId });
    if (numRemoved > 0) {
      res.json({ message: 'Produkt borttagen' });
    } else {
      res.status(404).send("Menu item not found");
    }
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).send("Internal Server Error");
  }
});



// Route to get a specific menu item by id
router.get('/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const menuItem = await menuDB.findOne({ _id: itemId });

    if (menuItem) {
      console.log("Menu item:", menuItem);
      res.json(menuItem);
    } else {
      res.status(404).send("Menu item not found");
    }
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).send("Internal Server Error");
  }
});



export default router;
export { menuDB };