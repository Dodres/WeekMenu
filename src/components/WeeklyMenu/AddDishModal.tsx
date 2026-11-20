import React, { useState } from 'react';
import { X, Plus, Sparkles, BookOpen, Clock, Check } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { Recipe, DayKey, MealType } from '../../types.ts';
import { SEASON_LABELS, getCurrentSeason, formatRecipeSeasons } from '../../data/initialData.ts';

export interface GroupOption {
  id: string;
  label: string;
  icon?: string;
}

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: DayKey;
  dayLabel: string;
  mealType: MealType;
  availableGroups: GroupOption[];
  defaultGroupId?: string;
  onAdd: (dishName: string, groupId: string, recipe?: Recipe, addIngredients?: boolean) => void;
}

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  dayKey,
  dayLabel,
  mealType,
  availableGroups,
  defaultGroupId,
  onAdd,
}) => {
  const { household } = useHousehold();
  const [tab, setTab] = useState<'custom' | 'recipes'>('custom');
  const [dishName, setDishName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    defaultGroupId || (availableGroups[0]?.id || 'grp_default')
  );
  const [autoIngredients, setAutoIngredients] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  // Suggerimenti dal ricettario mentre si scrive in "Scrittura libera"
  const [linkedRecipe, setLinkedRecipe] = useState<Recipe | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  if (!isOpen) return null;

  // Testo normalizzato: minuscolo, senza accenti e spazi doppi
  const normalize = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  // Ricette che corrispondono a quanto scritto (max 5), le più pertinenti prima
  const getSuggestions = (text: string): Recipe[] => {
    const q = normalize(text);
    if (q.length < 2) return [];
    const tokens = q.split(' ');
    const scored = household.recipes
      .map((r) => {
        const name = normalize(r.name);
        const words = name.split(' ');
        let score = -1;
        if (name.startsWith(q)) score = 0;
        else if (name.includes(q)) score = 1;
        else if (tokens.every((t) => words.some((w) => w.startsWith(t)))) score = 2;
        return { r, score };
      })
      .filter((x) => x.score >= 0 && normalize(x.r.name) !== q);
    scored.sort((a, b) => a.score - b.score || a.r.name.localeCompare(b.r.name));
    return scored.slice(0, 5).map((x) => x.r);
  };

  const suggestions = getSuggestions(dishName);
  const suggestionsVisible = showSuggestions && suggestions.length > 0 && !linkedRecipe;

  const handleDishNameChange = (value: string) => {
    setDishName(value);
    // Se il nome coincide esattamente con una ricetta, la collego automaticamente
    const exact = household.recipes.find((r) => normalize(r.name) === normalize(value));
    setLinkedRecipe(exact || null);
    setShowSuggestions(true);
    setHighlighted(-1);
  };

  const pickSuggestion = (recipe: Recipe) => {
    setDishName(recipe.name);
    setLinkedRecipe(recipe);
    setShowSuggestions(false);
    setHighlighted(-1);
  };

  const handleDishNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsVisible) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const currentSeason = getCurrentSeason();

  // Freshness calculation
  const getFreshnessStatus = (r: Recipe) => {
    if (!r.lastPreparedDate) return { isFresh: true, text: 'Non preparato di recente' };
    const diffDays = Math.floor((new Date().getTime() - new Date(r.lastPreparedDate).getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 7) return { isFresh: false, text: `Cucinato ${diffDays} gg fa` };
    if (diffDays <= 14) return { isFresh: false, text: `Cucinato ${diffDays} gg fa` };
    return { isFresh: true, text: `Preparato ${diffDays} gg fa` };
  };

  const filteredRecipes = household.recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    r.ingredients.some((i) => i.toLowerCase().includes(recipeSearch.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'custom') {
      if (!dishName.trim()) return;
      if (linkedRecipe) {
        // Piatto scelto tra i suggerimenti: lo collego alla ricetta (e ai suoi ingredienti)
        onAdd(linkedRecipe.name, selectedGroupId, linkedRecipe, autoIngredients);
      } else {
        onAdd(dishName.trim(), selectedGroupId, undefined, false);
      }
    } else {
      if (!selectedRecipe) return;
      onAdd(selectedRecipe.name, selectedGroupId, selectedRecipe, autoIngredients);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-app-card rounded-2xl border border-app-subtle shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-app-subtle flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-app-main">
              Aggiungi Piatto
            </h2>
            <p className="text-xs text-app-muted">
              {dayLabel} · {mealType === 'pranzo' ? 'Pranzo' : 'Cena'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-app-muted hover:text-app-main hover:bg-app-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Group Selector (Only show if more than 1 group exists!) */}
        {availableGroups.length > 1 && (
          <div className="px-4 pt-3 pb-2 border-b border-app-subtle bg-app-muted/30">
            <label className="text-xs font-semibold text-app-muted block mb-1.5">
              Piatto per:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableGroups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-app-primary text-white border-app-primary shadow-xs'
                        : 'bg-app-card text-app-main border-app-subtle hover:bg-app-muted'
                    }`}
                  >
                    {group.icon && <span>{group.icon}</span>}
                    <span>{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex border-b border-app-subtle px-4">
          <button
            onClick={() => setTab('custom')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'custom'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            Scrittura libera
          </button>
          <button
            onClick={() => setTab('recipes')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              tab === 'recipes'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dal Ricettario ({household.recipes.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4">
          {tab === 'custom' ? (
            <div>
              <label className="text-xs font-semibold text-app-main block mb-1">
                Nome del piatto
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  placeholder="es. Pasta alla Nerano, Bistecca con insalata..."
                  value={dishName}
                  onChange={(e) => handleDishNameChange(e.target.value)}
                  onKeyDown={handleDishNameKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-app-subtle bg-app-card text-app-main focus:border-app-primary focus:ring-1 focus:ring-app-primary outline-hidden"
                />

                {/* Suggerimenti dal ricettario */}
                {suggestionsVisible && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-app-subtle bg-app-card shadow-lg overflow-hidden">
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Dal ricettario
                    </div>
                    {suggestions.map((recipe, idx) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(recipe)}
                        onMouseEnter={() => setHighlighted(idx)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer ${
                          idx === highlighted ? 'bg-app-primary-light text-app-primary' : 'text-app-main hover:bg-app-muted'
                        }`}
                      >
                        <span className="font-semibold truncate">{recipe.name}</span>
                        <span className="text-[10px] text-app-muted shrink-0">{recipe.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {linkedRecipe ? (
                <div className="mt-2 p-2.5 rounded-xl border border-app-primary-border bg-app-primary-light/50 space-y-1.5">
                  <div className="text-[11px] text-app-primary font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Collegato alla ricetta «{linkedRecipe.name}»
                  </div>
                  {linkedRecipe.ingredients.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-app-main cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoIngredients}
                        onChange={(e) => setAutoIngredients(e.target.checked)}
                        className="w-4 h-4 rounded-sm text-app-primary accent-[var(--primary)]"
                      />
                      <span>Aggiungi gli ingredienti ({linkedRecipe.ingredients.length}) alla Lista della Spesa</span>
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-app-muted mt-1.5">
                  Scrivi liberamente: se il nome somiglia a una ricetta del ricettario te la suggerisco.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Cerca per nome o ingrediente..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
              />

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredRecipes.map((recipe) => {
                  const freshness = getFreshnessStatus(recipe);
                  const isSelected = selectedRecipe?.id === recipe.id;

                  return (
                    <div
                      key={recipe.id}
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-app-primary bg-app-primary-light shadow-xs'
                          : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-app-main">
                            {recipe.name}
                          </div>
                          <div className="text-[11px] text-app-muted flex items-center gap-2 mt-0.5">
                            <span>{formatRecipeSeasons(recipe)}</span>
                            <span>·</span>
                            <span>{recipe.category}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> {recipe.prepTime}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-app-primary text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm shrink-0 ${
                              freshness.isFresh
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {freshness.text}
                          </span>
                        )}
                      </div>

                      {recipe.ingredients.length > 0 && (
                        <div className="text-[10px] text-app-muted mt-2 line-clamp-1">
                          🛒 {recipe.ingredients.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedRecipe && (
                <label className="flex items-center gap-2 text-xs text-app-main pt-2 cursor-pointer border-t border-app-subtle">
                  <input
                    type="checkbox"
                    checked={autoIngredients}
                    onChange={(e) => setAutoIngredients(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-app-primary accent-[var(--primary)]"
                  />
                  <span>
                    Aggiungi automaticamente gli ingredienti ({selectedRecipe.ingredients.length}) alla Lista della Spesa
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex justify-end gap-2 border-t border-app-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-app-muted hover:bg-app-muted transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={tab === 'custom' ? !dishName.trim() : !selectedRecipe}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-app-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-xs cursor-pointer"
            >
              Aggiungi al Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
