"use client";
import Head from "next/head";
import { useState,useEffect } from "react";

export default function Home() {
  const [walletState, setWalletState] = useState({
    status: "disconnected", // disconnected, connecting, connected, error
    address: "",
    signature: "",
    errorMessage: "",
    walletType: "",
  });

  // Add this after your useState section
  const [walletDetectionState, setWalletDetectionState] = useState({
    detected: false,
    checking: true,
  });

  // Add a useEffect to detect wallet injection
  // Add a useEffect to detect wallet injection
useEffect(() => {
  const checkForCtrlWallet = () => {
    // Add XFI to the detection logic
    const hasWallet =
      !!window.xfi ||
      window.ethereum?.isCtrl ||
      !!window.ctrlEthProviders?.["Ctrl Wallet"] ||
      !!window.ctrl;

    if (hasWallet) {
      console.log("Bitcoin wallet detected", {
        xfi: !!window.xfi,
        ethereum: !!window.ethereum,
        isCtrl: window.ethereum?.isCtrl,
        ctrlEthProviders: !!window.ctrlEthProviders?.["Ctrl Wallet"],
        ctrl: !!window.ctrl,
      });
      setWalletDetectionState({ detected: true, checking: false });
    } else {
      setWalletDetectionState({ detected: false, checking: false });
    }
  };

  // Check immediately
  checkForCtrlWallet();

  // Also check after a delay to allow for injection
  const timer = setTimeout(checkForCtrlWallet, 1500);

  // Listen for ethereum initialization
  window.addEventListener("ethereum#initialized", checkForCtrlWallet);
  
  // Also check if XFI becomes available
  const xfiCheckInterval = setInterval(() => {
    if (window.xfi) {
      checkForCtrlWallet();
      clearInterval(xfiCheckInterval);
    }
  }, 500);

  return () => {
    clearTimeout(timer);
    clearInterval(xfiCheckInterval);
    window.removeEventListener("ethereum#initialized", checkForCtrlWallet);
  };
}, []);

  // Modified to only check for Ctrl wallet
  // Modified to better detect Ctrl wallet with Bitcoin support
  // Modified to check for XFI provider first
const safeGetWalletProvider = () => {
  try {
    // Check for XFI implementation first
    if (window.xfi) {
      console.log("Found XFI wallet implementation");
      return {
        type: "xfi",
        provider: window.xfi,
      };
    }
    
    // Check for Brave's Ctrl wallet implementation
    if (window.ethereum && window.ethereum.isCtrl) {
      console.log("Found Brave's Ctrl wallet implementation");
      return {
        type: "brave-ctrl",
        provider: window.ethereum,
      };
    }

    // Check standard ctrlEthProviders pattern
    if (
      window.ctrlEthProviders &&
      window.ctrlEthProviders["Ctrl Wallet"]?.provider
    ) {
      console.log("Found Ctrl wallet via ctrlEthProviders");
      return {
        type: "ctrlEthProviders",
        provider: window.ctrlEthProviders["Ctrl Wallet"].provider,
      };
    }
    // Check direct ctrl object
    else if (window.ctrl) {
      console.log("Found direct Ctrl wallet object");
      return {
        type: "ctrl",
        provider: window.ctrl,
      };
    }
    return null;
  } catch (err) {
    console.error("Error getting wallet provider:", err);
    return null;
  }
};

  const safeErrorMessage = (error) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    try {
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  };

  // Simplified connection logic focusing only on Bitcoin operations
  // Complete the connectWallet function to handle Bitcoin-specific operations
  // Updated connection logic to handle XFI provider
// Updated connection logic for XFI with proper API methods
const connectWallet = async () => {
  try {
    setWalletState({
      status: "connecting",
      address: "",
      signature: "",
      errorMessage: "",
      walletType: "",
    });

    // Allow time for wallet to inject if needed
    if (!window.xfi && !window.ctrlEthProviders && !window.ctrl && !window.ethereum) {
      console.log("No wallet detected immediately, waiting for injection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const walletInfo = safeGetWalletProvider();
    if (!walletInfo) {
      throw new Error(
        "No compatible wallet detected. Please install Ctrl wallet or enable Bitcoin support in your browser."
      );
    }

    console.log(`Found wallet provider:`, walletInfo);
    const { type, provider } = walletInfo;

    let address = "";
    try {
      // Handle XFI provider specifically - inspect available methods
      if (type === "xfi") {
        console.log("Using XFI provider for Bitcoin");
        console.log("XFI provider methods:", Object.keys(provider));
        
        // Try different approaches for XFI
        if (provider.bitcoin && typeof provider.bitcoin.getAccounts === 'function') {
          const accounts = await provider.bitcoin.getAccounts();
          console.log("XFI Bitcoin accounts via bitcoin.getAccounts:", accounts);
          address = accounts[0];
        } 
        else if (provider.bitcoin && typeof provider.bitcoin.requestAccounts === 'function') {
          const accounts = await provider.bitcoin.requestAccounts();
          console.log("XFI Bitcoin accounts via bitcoin.requestAccounts:", accounts);
          address = accounts[0];
        }
        else if (provider.getAddresses && typeof provider.getAddresses === 'function') {
          const addresses = await provider.getAddresses();
          console.log("XFI Bitcoin addresses via getAddresses:", addresses);
          address = addresses[0];
        }
        else if (provider.addresses) {
          console.log("XFI Bitcoin addresses via addresses property:", provider.addresses);
          address = Array.isArray(provider.addresses) ? provider.addresses[0] : provider.addresses;
        }
        else if (provider.selectedAddress) {
          console.log("XFI Bitcoin address via selectedAddress:", provider.selectedAddress);
          address = provider.selectedAddress;
        }
        else {
          // Last resort - directly inspect the provider object
          console.log("Inspecting full XFI provider object:", provider);
          throw new Error("Could not find Bitcoin accounts in XFI provider. Check console for details.");
        }
      } else {
        // Use standard Bitcoin request method for other wallet types
        const accounts = await provider.request({
          method: "btc_requestAccounts",
        });
        console.log(`Bitcoin accounts from ${type}:`, accounts);
        address = accounts[0];
      }

      if (!address) {
        throw new Error("No Bitcoin address returned from wallet");
      }
    } catch (err) {
      console.error("Failed to get Bitcoin account:", err);
      throw new Error(
        `Failed to get Bitcoin address: ${safeErrorMessage(err)}`
      );
    }

    // Once we have the address, perform a basic message signing for authentication
    let signature = "";
    try {
      const message = "Sign this message to authenticate with our Bitcoin app";
      
      // Handle XFI provider specifically for signing
      if (type === "xfi") {
        // Log available methods to help debug
        console.log("Looking for signing methods in XFI provider");
        
        if (provider.bitcoin && typeof provider.bitcoin.signMessage === 'function') {
          signature = await provider.bitcoin.signMessage(message, address);
        }
        else if (typeof provider.signMessage === 'function') {
          signature = await provider.signMessage(message, address);
        }
        else if (typeof provider.sign === 'function') {
          signature = await provider.sign(message, address);
        }
        else {
          console.warn("No signing method found in XFI provider - skipping signature");
        }
      } else {
        // Use standard signing method for other providers
        signature = await provider.request({
          method: "personal_sign",
          params: [message, address],
        });
      }
      
      console.log("Bitcoin signature obtained:", signature);
    } catch (err) {
      console.warn("Bitcoin signature request failed:", err);
      // Continue without signature if this fails
    }

    // Successfully connected
    setWalletState({
      status: "connected",
      address,
      signature, 
      errorMessage: "",
      walletType: type,
    });

    console.log("Successfully connected to Bitcoin wallet:", address);
  } catch (err) {
    console.error("Bitcoin wallet connection error:", err);
    setWalletState({
      status: "error",
      address: "",
      signature: "",
      errorMessage: safeErrorMessage(err),
      walletType: "",
    });
  }
};

  const disconnectWallet = () => {
    setWalletState({
      status: "disconnected",
      address: "",
      signature: "",
      errorMessage: "",
      walletType: "",
    });
  };

  return (
    <div>
      <Head>
        <title>Bitcoin Wallet Connection</title>
      </Head>

      {!walletDetectionState.detected && !walletDetectionState.checking && (
        <div className="bg-yellow-50 p-4 rounded-lg text-sm mb-3">
          <p className="font-medium text-yellow-700">
            Ctrl Wallet Not Detected
          </p>
          <p className="text-yellow-600 mt-1">
            Please install Ctrl wallet extension and refresh the page.
          </p>
        </div>
      )}
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Ctrl Bitcoin Wallet
          </h1>

          {walletState.status === "connected" ? (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-700 font-medium">
                  Successfully connected!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Wallet type: {walletState.walletType}
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <p className="text-sm text-gray-500">BTC Address</p>
                  <p className="font-mono text-sm break-all bg-gray-50 p-2 rounded">
                    {walletState.address}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Signature</p>
                  <p className="font-mono text-sm break-all bg-gray-50 p-2 rounded">
                    {walletState.signature}
                  </p>
                </div>
              </div>

              <button
                onClick={disconnectWallet}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {walletState.status === "error" && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-red-700 font-medium">Connection Error</p>
                  <p className="text-red-600 text-sm mt-1">
                    {walletState.errorMessage}
                  </p>
                </div>
              )}

              {walletState.status === "connecting" ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={connectWallet}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Connect Ctrl Wallet
                  </button>

                  <div className="bg-blue-50 p-4 rounded-lg text-sm">
                    <h3 className="font-medium text-blue-700 mb-2">
                      Connection Tips
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-blue-800">
                      <li>
                        Make sure your Ctrl wallet extension is installed and
                        enabled
                      </li>
                      <li>Ensure your wallet is unlocked</li>
                      <li>
                        Check browser console for detailed error information
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
