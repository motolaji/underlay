# reown-wagmi-setup.md

## Goal

Set up wallet connectivity for Underlay using Reown AppKit, wagmi, and viem.

## Requirements

- Use `@reown/appkit`
- Use `@reown/appkit-adapter-wagmi`
- Use `wagmi` and `viem`
- Do not use `ethers.js`
- Support Base Sepolia now and leave room for 0G Chain once chain metadata is available

## Checklist

1. Create a shared wallet config file outside route components
2. Set up a provider wrapper with React Query and WagmiProvider
3. Add Reown AppKit initialization in a client-safe location
4. Handle missing `NEXT_PUBLIC_REOWN_PROJECT_ID` gracefully in the UI
5. Add the Next.js webpack externals recommended by Reown for SSR
