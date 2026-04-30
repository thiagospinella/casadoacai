import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Home } from '@/pages/Home';
import { Montar } from '@/pages/Montar';
import { Checkout } from '@/pages/Checkout';
import { Pedido } from '@/pages/Pedido';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/montar" element={<Montar />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedido/:id" element={<Pedido />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

export default App;
