import { useState, FC } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { TruckElectric } from "lucide-react";
import GoogleLoginBtn from "../Functional/GoogleLoginBtn";
import { useTranslation } from "react-i18next";

export const RegisterModal: FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button id="register-btn" onClick={onOpen} className="hidden">
        Register
      </button>

      <Modal
        isOpen={isOpen}
        isDismissable={true}
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="blur"
        size="sm"
        classNames={{
          base: "rounded-2xl",
          header: "border-b border-divider",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TruckElectric className="text-primary" size={24} />
                  <h2 className="font-semibold">
                    {t("register_modal.steps.details.title")}
                  </h2>
                </div>
                <p className="text-xs text-foreground/50">
                  Create an account to get started
                </p>
              </ModalHeader>

              <ModalBody className="py-8 flex flex-col items-center gap-4">
                <p className="text-sm text-center text-default-500 max-w-xs">
                  Sign up with your Google account. We&apos;ll ask for your
                  phone number after sign-up to complete your profile.
                </p>
                <div className="w-full">
                  <GoogleLoginBtn
                    isLoading={isLoading}
                    onOpenChange={onOpenChange}
                    setIsLoading={setIsLoading}
                    context="register"
                  />
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default RegisterModal;
