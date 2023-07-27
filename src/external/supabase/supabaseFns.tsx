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
export const getUserByWalletAddress = async (walletAddress: string) => {
  const { data, error } = await supabase.from("users").select("id, email_address").eq("wallet_address", walletAddress);

  if (error || data.length === 0) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data[0];
};


export const updateUserEmail = async (walletAddress: string, email: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: users, error } = await supabase
    .from("users")
    .update({ email_address: email })
    .eq("wallet_address", walletAddress);

  if (error) {
    console.error("Error updating user email:", error);
    return false;
  }

  return true;
};
