# Supabase setup for Gym Diary

This is the backend setup for the optional account-based sync. The existing GitHub Pages app remains static and local-first.

## 1. Create the private table

In the Supabase project, open **SQL Editor**, paste the contents of `schema.sql`, and run it.

The table has one row per authenticated user. Row Level Security (RLS) restricts reads and writes to `auth.uid() = user_id`. Do not disable RLS and do not add public/anon policies.

## 2. Configure email/password auth

In **Authentication → Providers → Email**, enable email/password sign-in and email confirmation. In **Authentication → URL Configuration**, set the site URL to the deployed GitHub Pages URL and add that URL to the allowed redirect URLs.

## 3. Browser credentials

The browser integration should use only the project URL and the publishable/anon key. These are public client credentials; RLS is what protects diary rows. Never put a service-role/secret key or database password in the static site.

## 4. Before enabling sync

Test with two separate accounts: each must see and modify only its own diary. Keep local storage intact during initial sign-in; sync must not overwrite either side until the user chooses how to resolve existing local and cloud data.

## Current status

This directory contains the database schema and setup notes. The app-side sign-in, initial local/cloud merge, background sync, and ChatGPT integration are separate implementation steps and are not enabled by these SQL files alone.
