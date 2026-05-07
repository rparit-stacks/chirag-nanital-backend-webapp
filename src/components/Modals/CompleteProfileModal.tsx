import { useState, FC, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
} from "@heroui/react";
import { TruckElectric, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useDispatch } from "react-redux";
import { updateUserData } from "@/routes/api";
import { setUserDataRedux } from "@/lib/redux/slices/authSlice";
import { getCookie } from "@/lib/cookies";
import { checkPhoneExists } from "@/helpers/auth";
import { useSettings } from "@/contexts/SettingsContext";

const PhoneInput = dynamic(() => import("@/components/Functional/PhoneInput"), {
  ssr: false,
});

type Step = "phone" | "success";

export const CompleteProfileModal: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [friendsCode, setFriendsCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ phone: "" });
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const dispatch = useDispatch();
  const { demoMode } = useSettings();

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setStep("phone");
      setPhoneNumber("");
      setRawPhone("");
      setFieldErrors({ phone: "" });
      const cookieCode = getCookie("friend_code");
      if (cookieCode) setFriendsCode(cookieCode as string);
    };
    window.addEventListener("open-complete-profile", handleOpen);
    return () => window.removeEventListener("open-complete-profile", handleOpen);
  }, []);

  const useDebounce = <T extends unknown[]>(cb: (...args: T) => void, delay: number) => {
    const timer = useRef<NodeJS.Timeout | null>(null);
    return useCallback(
      (...args: T) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => cb(...args), delay);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [delay],
    );
  };

  const debouncedPhoneCheck = useDebounce(async (phone: string) => {
    if (!phone || phone.length < 8) return;
    await checkPhoneExists(phone, setIsCheckingPhone, (callback: any) => {
      const newErrors = callback({ phone: "" });
      setFieldErrors(newErrors);
    });
  }, 800);

  const handlePhoneChange = (
    cc: string,
    phone: string,
    dial: string,
    name: string,
  ) => {
    const formatted = `${dial}${phone}`;
    setPhoneNumber(formatted);
    setRawPhone(phone);
    setCountryCode(cc);
    setCountryName(name);
    setFieldErrors({ phone: "" });
    if (phone.length >= 8) {
      debouncedPhoneCheck(phone);
    }
  };

  const handleSave = async () => {
    if (!phoneNumber || rawPhone.length < 8) {
      addToast({ title: "Please enter a valid phone number", color: "danger" });
      return;
    }
    if (fieldErrors.phone) return;

    setIsLoading(true);
    try {
      const response = await updateUserData({
        mobile: rawPhone,
        iso_2: countryCode,
        country: countryName,
        friends_code: friendsCode || undefined,
      });

      if (response?.success) {
        dispatch(setUserDataRedux(response.data || {}));
        setStep("success");
        setTimeout(() => setIsOpen(false), 1800);
      } else {
        addToast({
          title: "Could not save phone number",
          description: response?.message || "Please try again",
          color: "danger",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.message || "Failed to update profile",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      hideCloseButton={true}
      backdrop="blur"
      placement="center"
      size="sm"
      classNames={{ base: "rounded-2xl" }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 border-b border-divider">
          <div className="flex items-center gap-2">
            <TruckElectric className="text-primary" size={24} />
            <span className="font-bold">
              {step === "phone" ? "One Last Step" : "Profile Completed!"}
            </span>
          </div>
          {step === "phone" && (
            <p className="text-xs text-foreground/50 font-normal">
              Add your phone number to complete your account
            </p>
          )}
        </ModalHeader>

        <ModalBody className="py-6">
          {step === "phone" && (
            <div className="space-y-4">
              <p className="text-sm text-default-500">
                Your phone number helps with delivery coordination.
              </p>
              <PhoneInput
                onPhoneChange={handlePhoneChange}
                defaultCountry={demoMode ? "in" : undefined}
                className="w-full"
              />
              {(fieldErrors.phone || isCheckingPhone) && (
                <div className="text-xs text-danger flex items-center gap-2">
                  {isCheckingPhone && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-danger" />
                  )}
                  {fieldErrors.phone}
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center py-4 gap-3 animate-in zoom-in duration-300">
              <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="text-success" size={32} />
              </div>
              <h3 className="text-xl font-bold">You&apos;re all set!</h3>
              <p className="text-sm text-default-500">Welcome aboard!</p>
            </div>
          )}
        </ModalBody>

        {step === "phone" && (
          <ModalFooter className="flex flex-col gap-2">
            <Button
              color="primary"
              className="w-full"
              isLoading={isLoading || isCheckingPhone}
              onPress={handleSave}
              isDisabled={
                !phoneNumber || rawPhone.length < 8 || !!fieldErrors.phone
              }
            >
              Save & Continue
            </Button>
            <Button
              variant="light"
              className="w-full text-default-400 text-sm"
              isDisabled={isLoading}
              onPress={() => setIsOpen(false)}
            >
              Skip for now
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};
