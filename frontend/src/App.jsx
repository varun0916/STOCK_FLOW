import { useState, useEffect } from 'react';
import axios from 'axios';

// Use Render backend URL instead of localhost
const API_URL =
  import.meta.env.VITE_API_URL || 'https://stock-flow-back.onrender.com';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [orgName, setOrgName] = useState('My Test Store');

  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    quantityOnHand: 0,
    sellingPrice: 0,
    lowStockThreshold: 5,
  });

  // which product is being edited (null = create mode)
  const [editingId, setEditingId] = useState(null);

  const isAuthed = !!token;

  const api = axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const handleAuth = async () => {
    try {
      if (authMode === 'signup') {
        const res = await axios.post(`${API_URL}/signup`, {
          email,
          password,
          organizationName: orgName,
        });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      } else {
        const res = await axios.post(`${API_URL}/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      }
    } catch (err) {
      alert('Auth failed');
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      sku: '',
      description: '',
      quantityOnHand: 0,
      sellingPrice: 0,
      lowStockThreshold: 5,
    });
    setEditingId(null);
  };

  const createProduct = async () => {
    try {
      await api.post('/products', productForm);
      resetForm();
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      alert('Create product failed');
      console.error(err);
    }
  };

  // update existing product
  const updateProduct = async () => {
    if (!editingId) return;
    try {
      await api.put(`/products/${editingId}`, productForm);
      resetForm();
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      alert('Update product failed');
      console.error(err);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      alert('Delete product failed');
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setProducts([]);
    setDashboard(null);
    setEditingId(null);
    resetForm();
  };

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur p-6 rounded-2xl shadow-xl border border-slate-800">
          <h2 className="text-3xl font-bold mb-1 text-center">
            StockFlow <span className="text-emerald-400">MVP</span>
          </h2>
          <p className="text-xs text-slate-400 text-center mb-6">
            Track products and low stock in minutes
          </p>

          <div className="flex bg-slate-800/80 rounded-lg p-1 mb-5 text-xs">
            <button
              onClick={() => setAuthMode('login')}
              disabled={authMode === 'login'}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                authMode === 'login'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              disabled={authMode === 'signup'}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                authMode === 'signup'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-300'
              }`}
            >
              Signup
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-200 mb-1">
                Email
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-200 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block font-medium text-slate-200 mb-1">
                  Organization Name
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
            )}

            <button
              className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold py-2 rounded-md text-xs transition shadow"
              onClick={handleAuth}
            >
              {authMode === 'signup' ? 'Create account' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lowStockItems = dashboard?.lowStockItems || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              StockFlow <span className="text-emerald-400">MVP</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Inventory snapshot for your store
            </p>
          </div>
          <button
            onClick={logout}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-md shrink-0"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* Stats row */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-[11px] text-slate-400">Total products</p>
            <p className="mt-2 text-2xl font-semibold">
              {dashboard?.totalProducts ?? 0}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-[11px] text-slate-400">
              Total quantity on hand
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {dashboard?.totalQuantity ?? 0}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-[11px] text-slate-400">Low stock items</p>
            <p className="mt-2 text-2xl font-semibold text-amber-400">
              {lowStockItems.length}
            </p>
          </div>
        </section>

        {/* Create / Update + Low stock */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Create / Update product */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editingId ? 'Update product' : 'Create product'}
              </h2>
              <span className="text-[11px] text-slate-500">
                SKU must be unique per org
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  placeholder="Name"
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                />
                <input
                  placeholder="SKU"
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sku: e.target.value })
                  }
                />
              </div>

              <input
                placeholder="Description"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
              />

              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  placeholder="Qty"
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                  value={productForm.quantityOnHand}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      quantityOnHand: Number(e.target.value),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      sellingPrice: Number(e.target.value),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Low stock threshold"
                  className="w-32 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                  value={productForm.lowStockThreshold}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      lowStockThreshold: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  className="inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-4 py-2"
                  onClick={editingId ? updateProduct : createProduct}
                >
                  {editingId ? 'Update product' : 'Add product'}
                </button>
                {editingId && (
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold px-3 py-2"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Low stock list */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Low stock items</h2>
              <span className="text-[11px] text-slate-500">
                Threshold ≤ per product or 5
              </span>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No low stock items right now.
              </p>
            ) : (
              <ul className="space-y-1 text-xs">
                {lowStockItems.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-md px-3 py-2"
                  >
                    <div className="pr-2">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.sku} • Qty {p.quantityOnHand}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40 shrink-0">
                      Low
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Products table */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Products</h2>
            <span className="text-[11px] text-slate-500">
              {products.length} items
            </span>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full text-xs border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-left font-medium">Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-800 hover:bg-slate-800/60"
                  >
                    <td className="px-3 py-2 max-w-[150px] truncate">
                      {p.name}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{p.sku}</td>
                    <td className="px-3 py-2">{p.quantityOnHand}</td>
                    <td className="px-3 py-2">
                      {p.sellingPrice ? `₹${p.sellingPrice}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        className="text-[11px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md"
                        onClick={() => {
                          setEditingId(p.id);
                          setProductForm({
                            name: p.name || '',
                            sku: p.sku || '',
                            description: p.description || '',
                            quantityOnHand: p.quantityOnHand || 0,
                            sellingPrice: p.sellingPrice || 0,
                            lowStockThreshold: p.lowStockThreshold || 5,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-[11px] bg-red-500/90 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                        onClick={() => deleteProduct(p.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No products yet. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
