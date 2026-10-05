/**
 * DB Queries: Recipes & Recipe Components
 *
 * Provides functions to retrieve recipe details and recipe component rules
 * from Supabase.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Recipe, RecipeComponent } from '@/src/types';

export interface RecipeWithComponents {
  recipe: Recipe;
  components: RecipeComponent[];
}

/**
 * Retrieves a single recipe and its components ordered by sort_order.
 *
 * @param client Supabase client instance
 * @param recipeId UUID of target recipe
 * @returns Recipe and component list, or null if not found
 */
export async function getRecipeWithComponents(
  client: SupabaseClient,
  recipeId: string,
): Promise<RecipeWithComponents | null> {
  const { data: recipe, error: recipeErr } = await client
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();

  if (recipeErr || !recipe) {
    return null;
  }

  const { data: components, error: compErr } = await client
    .from('recipe_components')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true });

  if (compErr || !components) {
    return null;
  }

  return {
    recipe: recipe as Recipe,
    components: components as RecipeComponent[],
  };
}

/**
 * Lists all recipes with their components.
 */
export async function getAllRecipes(
  client: SupabaseClient,
): Promise<RecipeWithComponents[]> {
  const { data: recipes, error: recipesErr } = await client
    .from('recipes')
    .select('*')
    .order('name', { ascending: true });

  if (recipesErr || !recipes) {
    return [];
  }

  const { data: allComponents, error: compErr } = await client
    .from('recipe_components')
    .select('*')
    .order('sort_order', { ascending: true });

  if (compErr || !allComponents) {
    return recipes.map((r) => ({ recipe: r as Recipe, components: [] }));
  }

  return recipes.map((r) => {
    const components = (allComponents as RecipeComponent[]).filter(
      (c) => c.recipe_id === r.id,
    );
    return {
      recipe: r as Recipe,
      components,
    };
  });
}
