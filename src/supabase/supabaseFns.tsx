/* eslint-disable no-console */
import { supabase } from "./supabaseClient";

// Function to add a user with a new wallet address
export const addUser = async (walletAddress: string) => {
  const { data, error } = await supabase.from("users").insert([{ wallet_address: walletAddress }]);

  if (error) {
    console.error("Error adding user:", error);
    return null;
  }

  return data;
};

// Function to check if a user with a certain wallet exists
export const checkUserExists = async (walletAddress: string) => {
  const { data, error } = await supabase.from("users").select("id").eq("wallet_address", walletAddress);

  if (error) {
    console.error("Error checking user:", error);
    return null;
  }

  return data && data.length > 0;
};
