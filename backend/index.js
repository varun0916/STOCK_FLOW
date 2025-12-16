const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'dev-secret-key';

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET); // { userId, organizationId }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Signup route
app.post('/signup', async (req, res) => {
  const { email, password, organizationName } = req.body;
  if (!email || !password || !organizationName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already used' });

    const org = await prisma.organization.create({
      data: { name: organizationName },
    });

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        organizationId: org.id,
      },
    });

    const token = jwt.sign(
      { userId: user.id, organizationId: org.id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create product
app.post('/products', authMiddleware, async (req, res) => {
  const {
    name,
    sku,
    description,
    quantityOnHand,
    costPrice,
    sellingPrice,
    lowStockThreshold,
  } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Name and SKU are required' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description: description || null,
        quantityOnHand: quantityOnHand ?? 0,
        costPrice: costPrice ?? null,
        sellingPrice: sellingPrice ?? null,
        lowStockThreshold: lowStockThreshold ?? null,
        organizationId: req.user.organizationId,
      },
    });

    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Create product failed' });
  }
});

// List products
app.get('/products', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'List products failed' });
  }
});

// Update product
app.put('/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const {
    name,
    sku,
    description,
    quantityOnHand,
    costPrice,
    sellingPrice,
    lowStockThreshold,
  } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        description,
        quantityOnHand,
        costPrice,
        sellingPrice,
        lowStockThreshold,
      },
    });

    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Update product failed' });
  }
});

// Delete product
app.delete('/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete product failed' });
  }
});

// Dashboard summary
app.get('/dashboard', authMiddleware, async (req, res) => {
  const orgId = req.user.organizationId;
  const DEFAULT_THRESHOLD = 5;

  try {
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
    });

    const totalProducts = products.length;
    const totalQuantity = products.reduce(
      (sum, p) => sum + (p.quantityOnHand || 0),
      0
    );

    const lowStockItems = products.filter((p) => {
      const threshold = p.lowStockThreshold ?? DEFAULT_THRESHOLD;
      return (p.quantityOnHand || 0) <= threshold;
    });

    res.json({
      totalProducts,
      totalQuantity,
      lowStockItems,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Dashboard failed' });
  }
});

// Root route (simple health check)
app.get('/', (req, res) => {
  res.json({ ok: true });
});

const PORT = 4000;
app.listen(PORT, () => console.log('Server running on port', PORT));
