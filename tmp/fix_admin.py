with open('src/components/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

broken_btn = """                          {/* Selection Checkbox for Bulk Actions */}
                          <button
                            type=button
                            onClick={() => handleToggleSelectArtist(art.id)}
                            className={}
                            title={isSelected ? 'Deseleksyone atis sa a' : 'Chwazi atis sa a pou aksyon an mas'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>"""

correct_btn = """                          {/* Selection Checkbox for Bulk Actions */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelectArtist(art.id)}
                            className={`p-1.5 rounded-xl transition-all shrink-0 mt-1 sm:mt-2 cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30 ring-1 ring-yellow-300'
                                : 'bg-white/[0.04] text-slate-500 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                            }`}
                            title={isSelected ? 'Deseleksyone atis sa a' : 'Chwazi atis sa a pou aksyon an mas'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>"""

if broken_btn in text:
    text = text.replace(broken_btn, correct_btn)
    print("Fixed button successfully")

with open('src/components/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
