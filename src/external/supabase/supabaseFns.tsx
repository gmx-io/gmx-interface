/* eslint-disable no-console */
import { supabase } from "./supabaseClient";
import crypto from "crypto";

export const addUser = async (walletAddress: string) => {
  //create referral code.
  const referralCode = generateReferralCode(10);
  const { data, error } = await supabase
    .from("users")
    .insert([{ wallet_address: walletAddress, referral_code: referralCode }]);

  if (error) {
    console.error("Error adding user:", error);
    return null;
  }

  return data;
};

export const getUserReferralCode = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("referral_code")
    .eq("wallet_address", walletAddress)
    .single();

  return data;
};

function generateReferralCode(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const code = crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .toUpperCase()
    .split("")
    .filter((char) => characters.includes(char))
    .join("")
    .substring(0, length);

  return code;
}

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

  console.log("user data", users);
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
