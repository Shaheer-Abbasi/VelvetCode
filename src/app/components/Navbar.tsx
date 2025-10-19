export default function Navbar() {
  return (
    <nav className="flex justify-between items-center bg-[#181818] text-white px-6 py-3 border-b border-[#2a2a2a]">
      <h2 className="text-xl font-semibold">VelvetCode</h2>

      <div className="flex gap-3">
        <button className="bg-transparent text-gray-300 hover:text-white border border-[#2a2a2a] px-4 py-1.5 rounded-lg transition-all">
          Sign In
        </button>
        <button className="bg-uhred text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition-all">
          Sign Up
        </button>
      </div>
    </nav>
  );
}
