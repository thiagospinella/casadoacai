// Tela placeholder — confirma que o setup tá rodando.
// A vibe é caseira/fresca: creme de fundo, roxo na marca, toque de verde.
export function Home() {
  return (
    <main className="min-h-screen bg-casa-cream flex items-center justify-center p-6">
      <div className="text-center max-w-xl">
        <h1 className="font-display text-5xl md:text-7xl font-bold text-casa-purple leading-tight">
          Casa do Açaí
        </h1>

        <div className="mt-2 inline-block h-1 w-24 rounded-full bg-casa-green" />

        <p className="mt-8 text-lg md:text-xl text-casa-purple-dark/70 font-medium">
          Em breve... 🍇
        </p>

        <p className="mt-2 text-sm text-casa-purple-dark/50">
          @casadoacai013_ · todos os dias 14h–02h
        </p>
      </div>
    </main>
  );
}

export default Home;
