export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#121212] text-gray-300 p-4 border-r border-[#2a2a2a]">
      <ul>
        <li className="py-2 hover:text-white cursor-pointer">Files</li>
        <li className="py-2 hover:text-white cursor-pointer">Settings</li>
        <li className="py-2 hover:text-white cursor-pointer">About</li>
      </ul>
    </aside>
  );
}
