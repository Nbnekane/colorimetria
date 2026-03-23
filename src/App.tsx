import { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './lib/supabase';
import { Camera, Palette, MessageCircle, Loader2, Send, Upload } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('test');
  const [step, setStep] = useState('home');
  const [testStep, setTestStep] = useState(0);
  const [answers, setAnswers] = useState({ skin: '', undertone: '', eyes: '', hair: '' });
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setPhoto(canvas.toDataURL('image/jpeg'));
    }
  };

  const analyzePhoto = async () => {
    if (!photo) return;
    setIsLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: photo.split(',')[1] } },
            { text: "Analiza esta foto y determina la estación de colorimetría (Primavera, Verano, Otoño, Invierno) de la persona. Responde solo con el nombre de la estación." }
          ]
        }
      });
      setAnalysis(response.text || 'No pude determinar la estación.');
    } catch (error) {
      setAnalysis('Error al analizar la foto.');
    } finally {
      setIsLoading(false);
    }
  };

  const questions = [
    { key: 'skin', title: 'Tono de piel', options: ['Clara', 'Media', 'Oscura'] },
    { key: 'undertone', title: 'Subtono', options: ['Frío', 'Cálido', 'Neutro'] },
    { key: 'eyes', title: 'Color de ojos', options: ['Claros', 'Oscuros'] },
    { key: 'hair', title: 'Color de cabello', options: ['Rubio', 'Castaño', 'Negro', 'Pelirrojo'] },
  ];

  const seasonExamples = [
    { season: 'Primavera', description: 'Colores brillantes, cálidos y luminosos.', keyword: 'portrait,woman,makeup,spring' },
    { season: 'Verano', description: 'Tonos suaves, fríos y empolvados.', keyword: 'portrait,woman,makeup,summer' },
    { season: 'Otoño', description: 'Colores ricos, terrosos y cálidos.', keyword: 'portrait,woman,makeup,autumn' },
    { season: 'Invierno', description: 'Contrastes marcados, tonos fríos e intensos.', keyword: 'portrait,woman,makeup,winter' }
  ];

  const handleAnswer = (key: string, value: string) => {
    setAnswers({ ...answers, [key]: value });
    if (testStep < questions.length - 1) {
      setTestStep(testStep + 1);
    } else {
      setStep('results');
    }
  };

  const getPalette = (answers: any) => {
    if (answers.undertone === 'Frío') {
      return answers.skin === 'Clara' ? 'Verano' : 'Invierno';
    } else if (answers.undertone === 'Cálido') {
      return answers.skin === 'Clara' ? 'Primavera' : 'Otoño';
    }
    return 'Primavera'; // Default para Neutro
  };

  const paletteColors: Record<string, string[]> = {
    'Primavera': ['#FFD700', '#FF7F50', '#98FB98', '#FF69B4', '#87CEEB'],
    'Verano': ['#B0C4DE', '#D8BFD8', '#ADD8E6', '#FFB6C1', '#E6E6FA'],
    'Otoño': ['#8B4513', '#DAA520', '#556B2F', '#A0522D', '#CD853F'],
    'Invierno': ['#000000', '#FFFFFF', '#FF0000', '#00008B', '#800080']
  };

  const saveResults = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from('results')
      .insert([{ ...answers, palette: getPalette(answers) }]);
    setIsLoading(false);
    if (error) alert('Error al guardar: ' + error.message);
    else alert('Resultados guardados con éxito');
  };

  const askChatbot = async () => {
    if (!chatInput.trim()) return;
    
    setIsLoading(true);
    const userMessage = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eres una experta en colorimetría y maquillaje. Responde brevemente a: ${userMessage}`,
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: response.text || 'Lo siento, no pude obtener una respuesta.' }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Hubo un error al conectar con la IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="p-6 border-b border-stone-200 bg-white sticky top-0 z-10">
        <h1 className="text-2xl font-serif italic text-stone-800">Colorimetría IA</h1>
      </header>
      
      <main className="p-6 pb-24 max-w-2xl mx-auto">
        {activeTab === 'test' && (
          <div className="space-y-6">
            {step === 'home' && (
              <div className="text-center bg-white p-10 rounded-3xl shadow-sm border border-stone-100 space-y-4">
                <h2 className="text-3xl font-serif mb-6 text-stone-800">Descubre tu paleta ideal</h2>
                <button 
                  onClick={() => setStep('test')}
                  className="bg-stone-900 text-white px-8 py-4 rounded-full font-medium hover:bg-stone-800 transition shadow-lg w-full"
                >
                  Comenzar Test
                </button>
                <button 
                  onClick={() => { setStep('photo'); startCamera(); }}
                  className="bg-stone-100 text-stone-800 px-8 py-4 rounded-full font-medium hover:bg-stone-200 transition shadow-lg w-full flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Analizar con Foto
                </button>
              </div>
            )}
            {step === 'photo' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 text-center space-y-4">
                {!photo ? (
                  <>
                    <video ref={videoRef} className="w-full rounded-2xl bg-stone-900" autoPlay playsInline />
                    <button onClick={takePhoto} className="bg-stone-900 text-white px-8 py-3 rounded-full w-full">Tomar Foto</button>
                  </>
                ) : (
                  <>
                    <img src={photo} className="w-full rounded-2xl" />
                    {analysis ? (
                      <div className="text-2xl font-serif">Tu estación es: {analysis}</div>
                    ) : (
                      <button onClick={analyzePhoto} disabled={isLoading} className="bg-stone-900 text-white px-8 py-3 rounded-full w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Analizar Foto'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {step === 'test' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
                <h2 className="text-xl font-medium mb-8 text-stone-700">{questions[testStep].title}</h2>
                <div className="grid grid-cols-1 gap-4">
                  {questions[testStep].options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(questions[testStep].key, option)}
                      className="border border-stone-200 p-5 rounded-2xl hover:border-stone-400 hover:bg-stone-50 transition text-left font-medium"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 'results' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 text-center">
                <h2 className="text-3xl font-serif mb-6">Tu paleta: {getPalette(answers)}</h2>
                <div className="flex justify-center gap-2 mb-8">
                  {paletteColors[getPalette(answers)].map(color => (
                    <div key={color} className="w-12 h-12 rounded-full shadow-inner" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="bg-stone-100 p-6 rounded-2xl mb-8">
                  <h3 className="text-lg font-semibold mb-3">Recomendaciones</h3>
                  <p className="text-stone-700">Labiales: Tonos fríos/cálidos según tu paleta.</p>
                  <p className="text-stone-700">Sombras: Colores que resaltan tus ojos.</p>
                </div>
                <button 
                  onClick={saveResults} 
                  disabled={isLoading}
                  className="bg-stone-900 text-white px-8 py-3 rounded-full mb-4 w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar resultados'}
                </button>
                <button 
                  onClick={() => { setStep('home'); setTestStep(0); }}
                  className="text-stone-500 hover:text-stone-800 transition"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'colores' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-stone-800 text-center">Temperatura del Color</h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <h3 className="text-xl font-semibold text-stone-800 mb-4">Colores Cálidos (Primavera/Otoño)</h3>
                <div className="flex flex-wrap gap-2">
                  {['#FFD700', '#FF7F50', '#8B4513', '#DAA520', '#CD853F', '#FF4500', '#FF6347', '#FF8C00', '#F0E68C', '#808000', '#D2691E', '#BC8F8F'].map(color => (
                    <div key={color} className="w-12 h-12 rounded-2xl shadow-inner border border-stone-100" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <h3 className="text-xl font-semibold text-stone-800 mb-4">Colores Fríos (Verano/Invierno)</h3>
                <div className="flex flex-wrap gap-2">
                  {['#B0C4DE', '#D8BFD8', '#000000', '#FFFFFF', '#800080', '#87CEEB', '#4682B4', '#000080', '#008080', '#6A5ACD', '#708090', '#483D8B'].map(color => (
                    <div key={color} className="w-12 h-12 rounded-2xl shadow-inner border border-stone-100" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-serif text-stone-800 text-center">Inspiración por Estación</h2>
            <div className="grid grid-cols-1 gap-6">
              {seasonExamples.map((item) => (
                <div key={item.season} className="bg-white p-2 rounded-3xl shadow-sm border border-stone-100">
                  <img 
                    src={`https://source.unsplash.com/featured/?${item.keyword}`} 
                    alt={item.season} 
                    className="rounded-2xl mb-4 w-full h-56 object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-stone-800 mb-2">{item.season}</h3>
                    <p className="text-stone-600 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col h-[60vh]">
            <h3 className="text-lg font-semibold mb-4 text-stone-800">Pregunta a la IA</h3>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-stone-200 ml-auto' : 'bg-stone-100'}`}>
                  {msg.text}
                </div>
              ))}
              {isLoading && <div className="p-4 bg-stone-100 rounded-2xl"><Loader2 className="animate-spin" /></div>}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 p-4 border border-stone-200 rounded-full"
                placeholder="¿Qué labial me favorece?"
                onKeyPress={(e) => e.key === 'Enter' && askChatbot()}
              />
              <button onClick={askChatbot} disabled={isLoading} className="bg-stone-900 text-white p-4 rounded-full">
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-stone-200 p-4 flex justify-around shadow-lg">
        <button onClick={() => setActiveTab('test')} className={`flex flex-col items-center ${activeTab === 'test' ? 'text-stone-900' : 'text-stone-400'}`}>
          <Camera size={24} />
          <span className="text-xs mt-1">Test</span>
        </button>
        <button onClick={() => setActiveTab('colores')} className={`flex flex-col items-center ${activeTab === 'colores' ? 'text-stone-900' : 'text-stone-400'}`}>
          <Palette size={24} />
          <span className="text-xs mt-1">Colores</span>
        </button>
        <button onClick={() => setActiveTab('examples')} className={`flex flex-col items-center ${activeTab === 'examples' ? 'text-stone-900' : 'text-stone-400'}`}>
          <Palette size={24} />
          <span className="text-xs mt-1">Ejemplos</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center ${activeTab === 'chat' ? 'text-stone-900' : 'text-stone-400'}`}>
          <MessageCircle size={24} />
          <span className="text-xs mt-1">Chat</span>
        </button>
      </nav>
    </div>
  );
}
