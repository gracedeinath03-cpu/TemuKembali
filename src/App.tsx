import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, MessageCircle, Bell, User, Settings, 
  History, FileText, LogOut, ChevronLeft, MapPin, 
  Clock, Camera, Send, CheckCircle2, AlertCircle,
  Filter, Home as HomeIcon, Package
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { io, Socket } from 'socket.io-client';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
}

interface Item {
  id: number;
  user_id: number;
  user_name?: string;
  type: 'lost' | 'found';
  name: string;
  owner_name?: string;
  location: string;
  time: string;
  description: string;
  image_url?: string;
  status: 'active' | 'finished' | 'draft';
  created_at: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_name?: string;
  receiver_name?: string;
  item_id: number;
  content: string;
  created_at: string;
}

// --- Context ---
interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  socket: Socket | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark active:scale-95',
      secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 active:scale-95',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:scale-95',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-slate-900 placeholder:text-slate-400',
        className
      )}
      {...props}
    />
  )
);

const Card = ({ children, className, onClick, ...props }: { children: React.ReactNode; className?: string; onClick?: () => void; [key: string]: any }) => (
  <motion.div
    whileHover={onClick ? { y: -4 } : undefined}
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn(
      'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden',
      onClick && 'cursor-pointer active:opacity-80',
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

// --- Views ---

const SplashScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center text-white p-6 z-50">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mb-8"
    >
      <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
        <Package className="w-12 h-12 text-primary" />
      </div>
    </motion.div>
    <motion.h1
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-4xl font-bold mb-2"
    >
      TemuKehilangan
    </motion.h1>
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-primary-light mb-12 text-center max-w-xs"
    >
      Bantu sesama menemukan barang yang hilang dengan mudah dan cepat.
    </motion.p>
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-xs"
    >
      <Button onClick={onStart} className="w-full bg-white text-primary hover:bg-slate-50 py-4 text-lg">
        Mulai Sekarang
      </Button>
    </motion.div>
  </div>
);

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        navigate('/home');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6">
      <div className="mt-12 mb-8">
        <h2 className="text-3xl font-bold text-slate-900">{isRegister ? 'Buat Akun' : 'Selamat Datang'}</h2>
        <p className="text-slate-500 mt-2">
          {isRegister ? 'Daftar untuk mulai menggunakan TemuKehilangan' : 'Masuk untuk melanjutkan'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <Input 
            placeholder="Nama Lengkap" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        )}
        <Input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
        <Input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full py-4 text-lg mt-4">
          {isRegister ? 'Daftar' : 'Masuk'}
        </Button>
      </form>

      <div className="mt-auto text-center pb-8">
        <p className="text-slate-500">
          {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary font-semibold ml-1"
          >
            {isRegister ? 'Masuk' : 'Daftar'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, [search, filter]);

  const fetchItems = async () => {
    const typeParam = filter === 'all' ? '' : `&type=${filter}`;
    const res = await fetch(`/api/items?search=${search}${typeParam}`);
    const data = await res.json();
    setItems(data);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white p-6 sticky top-0 z-10 border-bottom border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Halo, {user?.name}</h1>
            <p className="text-slate-500 text-sm">Temukan barangmu hari ini</p>
          </div>
          <button onClick={() => navigate('/notifications')} className="relative p-2 bg-slate-100 rounded-full">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang atau lokasi..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={fetchItems} className="rounded-2xl px-6">Cari</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
        <Button 
          variant={filter === 'all' ? 'primary' : 'secondary'} 
          className="rounded-full px-6 py-2 text-sm"
          onClick={() => setFilter('all')}
        >
          Semua
        </Button>
        <Button 
          variant={filter === 'lost' ? 'primary' : 'secondary'} 
          className="rounded-full px-6 py-2 text-sm"
          onClick={() => setFilter('lost')}
        >
          Kehilangan
        </Button>
        <Button 
          variant={filter === 'found' ? 'primary' : 'secondary'} 
          className="rounded-full px-6 py-2 text-sm"
          onClick={() => setFilter('found')}
        >
          Menemukan
        </Button>
      </div>

      {/* List */}
      <div className="px-6 space-y-4">
        {items.map(item => (
          <Card key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="flex p-3 gap-4">
            <div className="w-24 h-24 bg-slate-200 rounded-xl flex-shrink-0 overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Package className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 py-1">
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-1",
                item.type === 'lost' ? "text-red-500" : "text-green-500"
              )}>
                {item.type === 'lost' ? 'Kehilangan' : 'Menemukan'}
              </div>
              <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{item.location}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(item.created_at), 'dd MMM yyyy')}</span>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">Tidak ada barang ditemukan</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/post')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-20"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};

const PostItem = () => {
  const [type, setType] = useState<'lost' | 'found' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    location: '',
    time: '',
    description: '',
    image_url: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (status: 'active' | 'draft') => {
    if (!type) return;
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, type, user_id: user?.id, status }),
    });
    if (res.ok) {
      navigate('/home');
    }
  };

  if (!type) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="mb-8 p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-8">Pilih Kategori</h2>
        <div className="grid grid-cols-1 gap-4">
          <Card onClick={() => setType('lost')} className="p-6 border-2 border-red-50 hover:border-red-200">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Kehilangan Barang</h3>
            <p className="text-slate-500 mt-1">Laporkan barang milikmu yang hilang</p>
          </Card>
          <Card onClick={() => setType('found')} className="p-6 border-2 border-green-50 hover:border-green-200">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Menemukan Barang</h3>
            <p className="text-slate-500 mt-1">Laporkan barang yang kamu temukan</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setType(null)} className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold">
          {type === 'lost' ? 'Lapor Kehilangan' : 'Lapor Menemukan'}
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Nama Barang</label>
          <Input 
            placeholder="Contoh: Dompet Kulit Cokelat" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>
        {type === 'lost' && (
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Nama Pemilik</label>
            <Input 
              placeholder="Nama kamu" 
              value={formData.owner_name}
              onChange={e => setFormData({...formData, owner_name: e.target.value})}
            />
          </div>
        )}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Lokasi {type === 'lost' ? 'Kehilangan' : 'Ditemukan'}</label>
          <Input 
            placeholder="Contoh: Stasiun Gambir" 
            value={formData.location}
            onChange={e => setFormData({...formData, location: e.target.value})}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Waktu {type === 'lost' ? 'Kehilangan' : 'Ditemukan'}</label>
          <Input 
            type="datetime-local" 
            value={formData.time}
            onChange={e => setFormData({...formData, time: e.target.value})}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Deskripsi / Ciri-ciri</label>
          <textarea 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-slate-900 min-h-[120px]"
            placeholder="Jelaskan detail barang..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">URL Foto (Optional)</label>
          <Input 
            placeholder="https://..." 
            value={formData.image_url}
            onChange={e => setFormData({...formData, image_url: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button variant="secondary" onClick={() => handleSubmit('draft')}>Simpan Draft</Button>
          <Button onClick={() => handleSubmit('active')}>Posting</Button>
        </div>
      </div>
    </div>
  );
};

const ItemDetail = () => {
  const [item, setItem] = useState<Item | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetch(`/api/items`) // In a real app, fetch by ID
      .then(res => res.json())
      .then(data => setItem(data.find((i: Item) => i.id === Number(id))));
  }, [id]);

  if (!item) return <div className="p-6">Loading...</div>;

  return (
    <div className="pb-24">
      <div className="relative h-72 bg-slate-200">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="w-16 h-16" />
          </div>
        )}
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 -mt-6 bg-white rounded-t-3xl relative z-10">
        <div className={cn(
          "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2",
          item.type === 'lost' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
        )}>
          {item.type === 'lost' ? 'Kehilangan' : 'Menemukan'}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{item.name}</h1>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Lokasi</p>
              <p className="text-sm font-medium text-slate-900">{item.location}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Waktu</p>
              <p className="text-sm font-medium text-slate-900">{format(new Date(item.time), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
          {item.owner_name && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pemilik</p>
                <p className="text-sm font-medium text-slate-900">{item.owner_name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-2">Deskripsi</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
        </div>

        <Button 
          variant="secondary" 
          className="w-full mb-8 border-primary/20 text-primary"
          onClick={async () => {
            const itemUrl = `${process.env.APP_URL || window.location.origin}/item/${item.id}`;
            const shareData = {
              title: `TemuKehilangan: ${item.name}`,
              text: `Tolong bantu! Ada info barang ${item.type === 'lost' ? 'hilang' : 'ditemukan'}: ${item.name} di ${item.location}.`,
              url: itemUrl,
            };
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                const textArea = document.createElement("textarea");
                textArea.value = itemUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Link barang berhasil disalin!');
              }
            } catch (err) {
              console.error('Error sharing:', err);
            }
          }}
        >
          <Send className="w-4 h-4" />
          Bagikan Info Ini
        </Button>

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {item.user_name?.[0]}
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Dilaporkan oleh</p>
            <p className="text-sm font-bold text-slate-900">{item.user_name}</p>
          </div>
        </div>
      </div>

      {user?.id !== item.user_id && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex gap-4">
          <Button 
            className="flex-1 py-4"
            onClick={() => navigate(`/chat/${item.user_id}?item=${item.id}`)}
          >
            <MessageCircle className="w-5 h-5" />
            Hubungi Pelapor
          </Button>
        </div>
      )}
    </div>
  );
};

const ChatRoom = () => {
  const { id: receiverId } = useParams();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('item');
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/messages/${user?.id}`)
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((m: Message) => 
          (m.sender_id === Number(receiverId) || m.receiver_id === Number(receiverId))
        );
        setMessages(filtered);
      });

    if (socket) {
      socket.on('receive_message', (msg: Message) => {
        if (msg.sender_id === Number(receiverId)) {
          setMessages(prev => [...prev, msg]);
        }
      });
    }

    return () => { socket?.off('receive_message'); };
  }, [receiverId, user?.id, socket]);

  const sendMessage = () => {
    if (!content.trim() || !socket) return;
    const msgData = {
      sender_id: user?.id,
      receiver_id: Number(receiverId),
      item_id: Number(itemId),
      content
    };
    socket.emit('send_message', msgData);
    setContent('');
    setMessages(prev => [...prev, { ...msgData, id: Date.now(), created_at: new Date().toISOString() } as Message]);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white p-4 flex items-center gap-4 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            U
          </div>
          <div>
            <h3 className="font-bold text-slate-900">User {receiverId}</h3>
            <p className="text-[10px] text-green-500 font-medium">Online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn(
            "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
            msg.sender_id === user?.id 
              ? "bg-primary text-white ml-auto rounded-tr-none" 
              : "bg-white text-slate-900 rounded-tl-none"
          )}>
            {msg.content}
            <p className={cn(
              "text-[10px] mt-1",
              msg.sender_id === user?.id ? "text-primary-light" : "text-slate-400"
            )}>
              {format(new Date(msg.created_at), 'HH:mm')}
            </p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input
          type="text"
          placeholder="Tulis pesan..."
          className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl focus:outline-none"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const MyItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/items/me?user_id=${user?.id}`)
      .then(res => res.json())
      .then(setItems);
  }, [user?.id]);

  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-bold mb-6">Barang Saya</h2>
      <div className="space-y-4">
        {items.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                item.status === 'active' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"
              )}>
                {item.status}
              </div>
              <p className="text-[10px] text-slate-400">{format(new Date(item.created_at), 'dd/MM/yyyy')}</p>
            </div>
            <h3 className="font-bold text-slate-900">{item.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.location}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1 py-2 text-xs">Edit</Button>
              <Button variant="secondary" className="flex-1 py-2 text-xs">Tandai Selesai</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-bold mb-8">Pengaturan</h2>
      <div className="space-y-2">
        <button 
          onClick={() => alert('Fitur Profil akan segera hadir')}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Profil Saya</span>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
        </button>
        <button 
          onClick={() => navigate('/notifications')}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Notifikasi</span>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
        </button>
        <button 
          onClick={() => alert('Fitur Privasi akan segera hadir')}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Privasi & Keamanan</span>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
        </button>
        <button 
          onClick={() => alert('Bahasa saat ini: Indonesia')}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Bahasa (Indonesia)</span>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
        </button>
        <button 
          onClick={async () => {
            const appUrl = process.env.APP_URL || window.location.origin;
            const shareData = {
              title: 'TemuKehilangan',
              text: 'Bantu temukan barang hilang dengan aplikasi TemuKehilangan!',
              url: appUrl,
            };
            
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                const textArea = document.createElement("textarea");
                textArea.value = appUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Link aplikasi berhasil disalin!\n\nSilakan bagikan link ini ke teman Anda.');
              }
            } catch (err) {
              console.error('Error sharing:', err);
            }
          }}
          className="w-full flex items-center justify-between p-4 bg-primary/10 text-primary rounded-2xl shadow-sm active:bg-primary/20 transition-colors mt-4"
        >
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5" />
            <span className="font-bold">Bagikan Aplikasi</span>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180 opacity-50" />
        </button>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 p-4 text-red-500 font-bold mt-8 active:opacity-70 transition-opacity"
        >
          <LogOut className="w-5 h-5" />
          Keluar Akun
        </button>
      </div>
    </div>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [
    { icon: HomeIcon, path: '/home', label: 'Home' },
    { icon: MessageCircle, path: '/chats', label: 'Chat' },
    { icon: FileText, path: '/my-items', label: 'Barang' },
    { icon: User, path: '/settings', label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-30">
      {tabs.map(tab => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            location.pathname === tab.path ? "text-primary" : "text-slate-400"
          )}
        >
          <tab.icon className="w-6 h-6" />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

const Chats = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/messages/${user?.id}`)
      .then(res => res.json())
      .then(data => {
        // Group by user
        const uniqueChats = data.reduce((acc: any, msg: Message) => {
          const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          if (!acc[otherId] || new Date(msg.created_at) > new Date(acc[otherId].created_at)) {
            acc[otherId] = msg;
          }
          return acc;
        }, {});
        setMessages(Object.values(uniqueChats));
      });
  }, [user?.id]);

  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-bold mb-6">Pesan</h2>
      <div className="space-y-2">
        {messages.map(msg => {
          const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          const otherName = msg.sender_id === user?.id ? msg.receiver_name : msg.sender_name;
          return (
            <Card key={msg.id} onClick={() => navigate(`/chat/${otherId}?item=${msg.item_id}`)} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {otherName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900 truncate">{otherName || `User ${otherId}`}</h3>
                  <span className="text-[10px] text-slate-400">{format(new Date(msg.created_at), 'HH:mm')}</span>
                </div>
                <p className="text-sm text-slate-500 truncate">{msg.content}</p>
              </div>
            </Card>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">Belum ada pesan</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">Notifikasi</h2>
      </div>
      <div className="space-y-4">
        <Card className="p-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Selamat Datang!</h4>
            <p className="text-xs text-slate-500 mt-1">Terima kasih telah bergabung di TemuKehilangan. Mulai lapor barang hilangmu sekarang.</p>
            <p className="text-[10px] text-slate-400 mt-2">Baru saja</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Main App ---
const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const showNav = ['/home', '/chats', '/my-items', '/settings'].includes(location.pathname);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-xl relative overflow-x-hidden">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/post" element={user ? <PostItem /> : <Navigate to="/login" />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/chats" element={user ? <Chats /> : <Navigate to="/login" />} />
        <Route path="/chat/:id" element={user ? <ChatRoom /> : <Navigate to="/login" />} />
        <Route path="/my-items" element={user ? <MyItems /> : <Navigate to="/login" />} />
        <Route path="/settings" element={user ? <SettingsView /> : <Navigate to="/login" />} />
        <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
};



export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (user) {
      const newSocket = io();
      newSocket.emit('join', user.id);
      setSocket(newSocket);
      return () => { newSocket.close(); };
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (showSplash) {
    return <SplashScreen onStart={() => setShowSplash(false)} />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, socket }}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
}
