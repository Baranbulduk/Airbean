import { Router } from 'express';
import nedb from 'nedb-promises';
import jwt from 'jsonwebtoken';

const menuDB = new nedb({ filename: 'airbean.db', autoload: true });
const router = Router();

// Middleware för autentisering och admin-kontroll
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).send('Token är ogiltig eller har gått ut');
    }
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

// Kampanjrelaterad kod
async function validateProducts(productIds) {
  try {
    const products = await menuDB.find({ id: { $in: productIds } });
    const foundProductIds = products.map(product => product.id);
    const missingProductIds = productIds.filter(id => !foundProductIds.includes(id));
    return { isValid: missingProductIds.length === 0, missingProductIds };
  } catch (err) {
    throw new Error('Något gick fel vid produktvalidering');
  }
}

router.post('/campaigns', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { productIds, price } = req.body;
    const { isValid, missingProductIds } = await validateProducts(productIds);
    if (!isValid) {
      return res.status(400).send(`Följande produkter finns inte: ${missingProductIds.join(', ')}`);
    }
    const newCampaign = { productIds, price };
    await menuDB.insert(newCampaign);
    res.status(201).send('Kampanj tillagd!');
  } catch (err) {
    res.status(500).send('Något gick fel när kampanjen skulle läggas till');
  }
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