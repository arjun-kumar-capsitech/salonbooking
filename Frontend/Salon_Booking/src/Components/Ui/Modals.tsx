  import React, { useEffect } from 'react';
  import { Modal, Button, Form } from 'antd';

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
    submitText = 'Submit',
    cancelText = 'Cancel',
    width = 400
  }) => {
    const [form] = Form.useForm();

    useEffect(() => {
      if (open) {
        form.setFieldsValue(initialValues || {});
      }
    }, [open, initialValues, form]);

    const handleSubmit = (values: any) => {
      onSubmit(values);
      form.resetFields();
    };

    const handleCancel = () => {
      form.resetFields();
      onClose();
    };

    return (
      <>
      <Modal
        title={title}
        open={open}
        onCancel={handleCancel}
        width={width}
        centered
        footer={[
          <Button onClick={handleCancel} disabled={loading}>
            {cancelText}
          </Button>,
          <Button 
            type="primary" 
            loading={loading}
            onClick={() => form.submit()}
            disabled={loading}
          >
            {submitText}
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          {children}
        </Form>
      </Modal>
      </>
    );
  };

  export default Modals;