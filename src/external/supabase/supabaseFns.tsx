/* eslint-disable no-console */
import { supabase } from "./supabaseClient";

export const addUser = async (walletAddress: string) => {
  //create referral code.

  const { data, error } = await supabase.from("users").insert([{ wallet_address: walletAddress, referral_code: "" }]);

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
  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("email_address")
    .eq("wallet_address", walletAddress)
    .single();

  
  if (fetchError) {
    console.error("Error fetching user data:", fetchError);
    return false;
  }

  // If no existing email, update the record
  // if (!users?.email_address?.trim()) {
  const { error: updateError } = await supabase
    .from("users")
    .update({ email_address: email })
    .eq("wallet_address", walletAddress);

  if (updateError) {
    console.error("Error updating user email:", updateError);
    return false;
  }

  return true;
  // } else {
  //   console.log("Email already exists, not updated.");
  //   return false;
  // }
};
