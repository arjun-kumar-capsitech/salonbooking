import React from "react";
import { Modal, Button, Form } from "antd";

interface ModalFormProps {
  open: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  initialValues?: any;
  onSubmit: (values: any) => void;
  loading?: boolean;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  width?: number;
  form?: any;
}

const Modals: React.FC<ModalFormProps> = ({
  open,
  onClose,
  title,
  initialValues,
  onSubmit,
  loading = false,
  children,
  submitText = "Submit",
  cancelText = "Cancel",
  width = 400,
  form: externalForm,
}) => {
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  const handleSubmit = (values: any) => {
    onSubmit(values);
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={width}
      centered
      destroyOnHidden
      maskClosable={false}
      style={{
        fontFamily: "Public Sans, sans-serif",
        fontWeight: "normal",
      }}
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          disabled={loading}
          style={{
            fontFamily: "Public Sans, sans-serif",
            fontWeight: "normal",
          }}
        >
          {cancelText}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
          disabled={loading}
          style={{
            fontFamily: "Public Sans, sans-serif",
            fontWeight: "normal",
          }}
        >
          {submitText}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        style={{
          fontFamily: "Public Sans, sans-serif",
          fontWeight: "normal",
        }}
      >
        {children}
      </Form>
    </Modal>
  );
};

export default Modals;