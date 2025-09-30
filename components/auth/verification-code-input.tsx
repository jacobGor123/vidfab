/**
 * Verification Code Input Component for VidFab AI Video Platform
 */
"use client";

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface VerificationCodeInputProps {
  length?: number;
  onComplete?: (code: string) => void;
  onChange?: (code: string) => void;
  value?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  autoFocus?: boolean;
}

export function VerificationCodeInput({
  length = 6,
  onComplete,
  onChange,
  value = "",
  disabled = false,
  className,
  error = false,
  autoFocus = false,
}: VerificationCodeInputProps) {
  const [codes, setCodes] = useState<string[]>(
    Array.from({ length }, (_, i) => value[i] || "")
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update codes when value prop changes
  useEffect(() => {
    const newCodes = Array.from({ length }, (_, i) => value[i] || "");
    setCodes(newCodes);
  }, [value, length]);

  // Smart focus management - focus first empty input or first input if autoFocus
  useEffect(() => {
    if ((autoFocus || codes.some(code => code)) && !disabled) {
      const firstEmptyIndex = codes.findIndex(code => !code);
      const targetIndex = firstEmptyIndex === -1 ? codes.length - 1 : firstEmptyIndex;
      
      requestAnimationFrame(() => {
        inputRefs.current[targetIndex]?.focus();
      });
    }
  }, [autoFocus, disabled, codes]);

  const handleChange = (index: number, newValue: string) => {
    // Only allow digits
    const sanitizedValue = newValue.replace(/\D/g, "");
    
    // Handle single character input (normal typing)
    if (sanitizedValue.length <= 1) {
      const newCodes = [...codes];
      newCodes[index] = sanitizedValue;
      setCodes(newCodes);

      const fullCode = newCodes.join("");
      onChange?.(fullCode);

      if (sanitizedValue && index < length - 1) {
        // Move to next input with proper delay to ensure DOM updates
        requestAnimationFrame(() => {
          inputRefs.current[index + 1]?.focus();
        });
      }

      if (fullCode.length === length) {
        onComplete?.(fullCode);
      }
    } else {
      // Handle multiple character input (paste or rapid input)
      // Only treat as paste if it's more than 2 characters or replacing current empty field
      if (sanitizedValue.length >= 3 || !codes[index]) {
        handlePaste(sanitizedValue, index);
      } else {
        // For 2 characters, take only the last one (normal rapid typing)
        const lastChar = sanitizedValue.slice(-1);
        const newCodes = [...codes];
        newCodes[index] = lastChar;
        setCodes(newCodes);

        const fullCode = newCodes.join("");
        onChange?.(fullCode);

        if (lastChar && index < length - 1) {
          requestAnimationFrame(() => {
            inputRefs.current[index + 1]?.focus();
          });
        }

        if (fullCode.length === length) {
          onComplete?.(fullCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      // Move to previous input and clear it
      const newCodes = [...codes];
      newCodes[index - 1] = "";
      setCodes(newCodes);
      requestAnimationFrame(() => {
        inputRefs.current[index - 1]?.focus();
      });
      onChange?.(newCodes.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      requestAnimationFrame(() => {
        inputRefs.current[index - 1]?.focus();
      });
    } else if (e.key === "ArrowRight" && index < length - 1) {
      requestAnimationFrame(() => {
        inputRefs.current[index + 1]?.focus();
      });
    } else if (e.key === "Delete") {
      // Clear current input and stay focused
      const newCodes = [...codes];
      newCodes[index] = "";
      setCodes(newCodes);
      onChange?.(newCodes.join(""));
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focused for easy replacement
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      inputRefs.current[index]?.select();
    });
  };

  const handlePaste = (pastedText: string, startIndex: number = 0) => {
    const digits = pastedText.replace(/\D/g, "").slice(0, length - startIndex);
    const newCodes = [...codes];
    
    for (let i = 0; i < digits.length; i++) {
      if (startIndex + i < length) {
        newCodes[startIndex + i] = digits[i];
      }
    }
    
    setCodes(newCodes);
    onChange?.(newCodes.join(""));
    
    // Focus the next empty input or last input with delay
    const nextIndex = Math.min(startIndex + digits.length, length - 1);
    requestAnimationFrame(() => {
      inputRefs.current[nextIndex]?.focus();
    });
    
    if (newCodes.join("").length === length) {
      onComplete?.(newCodes.join(""));
    }
  };

  const handlePasteEvent = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    handlePaste(pastedText, index);
  };

  const clear = () => {
    const newCodes = Array(length).fill("");
    setCodes(newCodes);
    onChange?.("");
    requestAnimationFrame(() => {
      inputRefs.current[0]?.focus();
    });
  };

  const focus = () => {
    const firstEmptyIndex = codes.findIndex(code => !code);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    requestAnimationFrame(() => {
      inputRefs.current[targetIndex]?.focus();
    });
  };

  // Expose methods via ref (for parent component control)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).verificationCodeInputMethods = { clear, focus };
    }
  }, []);

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {codes.map((code, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={code}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleChange(index, e.target.value)
          }
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={(e) => handlePasteEvent(e, index)}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-lg font-mono font-semibold",
            "border-2 rounded-lg transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            // Default styles
            "bg-white dark:bg-gray-800",
            "border-gray-300 dark:border-gray-600",
            "text-gray-900 dark:text-white",
            "focus:border-purple-500 focus:ring-purple-500",
            // Error styles
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            // Disabled styles
            disabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900",
            // Filled styles
            code && !error && "border-green-500 bg-green-50 dark:bg-green-900/20"
          )}
          placeholder="0"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

// Hook for easier usage
export function useVerificationCodeInput(options?: {
  length?: number;
  onComplete?: (code: string) => void;
  onChange?: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const clear = () => {
    setCode("");
    setError(false);
    requestAnimationFrame(() => {
      if (typeof window !== 'undefined') {
        (window as any).verificationCodeInputMethods?.clear();
      }
    });
  };

  const focus = () => {
    requestAnimationFrame(() => {
      if (typeof window !== 'undefined') {
        (window as any).verificationCodeInputMethods?.focus();
      }
    });
  };

  const setErrorState = (hasError: boolean) => {
    setError(hasError);
  };

  return {
    code,
    setCode,
    error,
    setError: setErrorState,
    clear,
    focus,
    VerificationCodeInputComponent: (props: Partial<VerificationCodeInputProps>) => (
      <VerificationCodeInput
        {...options}
        {...props}
        value={code}
        onChange={(newCode) => {
          setCode(newCode);
          options?.onChange?.(newCode);
        }}
        error={error}
        onComplete={(completedCode) => {
          setCode(completedCode);
          options?.onComplete?.(completedCode);
        }}
      />
    ),
  };
}