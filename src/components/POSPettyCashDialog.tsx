import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Button,
  Table,
  Tag,
  Form,
  InputNumber,
  Select,
  Upload,
  Divider,
  Typography,
  Row,
  Col,
  DatePicker,
} from "antd";
import {
  IconX,
  IconPlus,
  IconFileUpload,
  IconCash,
  IconReceipt,
  IconCalendar,
} from "@tabler/icons-react";
import api from "@/lib/api";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const { Text } = Typography;


interface POSPettyCashDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function POSPettyCashDialog({ open, onClose }: POSPettyCashDialogProps) {
  const { selectedStockId } = usePOS();
  const [form] = Form.useForm();
  const typeValue = Form.useWatch("type", form);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);

  const paymentMethodValue = Form.useWatch("paymentMethod", form);

  useEffect(() => {
    if (open) {
      fetchExpenses();
    }
  }, [open, selectedStockId]);

  useEffect(() => {
    if (open && typeValue) {
      fetchCategories(typeValue);
    }
  }, [open, typeValue]);

  const fetchCategories = async (type: "expense" | "income" = "expense") => {
    try {
      const { data } = await api.get(`/api/v1/pos/petty-cash/categories?type=${type}`);
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchExpenses = async () => {
    if (!selectedStockId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/v1/pos/petty-cash?stockId=${selectedStockId}`);
      setExpenses(data.data || []);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleFinish = async (values: any) => {
    if (!selectedStockId) {
      toast.error("Please select a stock location first");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      const pettyCashData: any = {
        ...values,
        stockId: selectedStockId,
        date: values.date ? values.date.toISOString() : dayjs().toISOString(),
      };
      
      formData.append("data", JSON.stringify(pettyCashData));
      
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("attachment", fileList[0].originFileObj);
      }

      await api.post("/api/v1/pos/petty-cash", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Transaction submitted successfully");
      form.resetFields();
      setFileList([]);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to add petty cash transaction:", error);
      toast.error("Failed to add petty cash transaction");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Transaction Details",
      key: "details",
      render: (_: any, record: any) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Tag color={record.type === "expense" ? "red" : "green"} className="text-[10px] font-black px-1.5 py-0 border-none rounded uppercase">
              {record.type}
            </Tag>
            <Text className="font-bold text-gray-900 leading-tight">
              {record.note || "No details provided"}
            </Text>
          </div>
          <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {record.category} • {record.paymentMethod?.toUpperCase() || "CASH"} • {new Date(record.date).toLocaleDateString()}
          </Text>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (amount: number) => (
        <Text className="font-black text-gray-900 tracking-tight">
          Rs. {amount.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string) => {
        const color =
          status === "APPROVED" ? "green" : status === "REJECTED" ? "red" : "orange";
        return (
          <Tag
            color={color}
            className="rounded-full px-3 py-0.5 border-none font-black text-[10px] uppercase tracking-widest shadow-sm"
          >
            {status}
          </Tag>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      footer={null}
      centered
      title={
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <IconCash size={24} className="text-green-600" />
          </div>
          <div className="flex flex-col">
            <Text className="text-lg font-black tracking-tight text-gray-900 leading-none">
              Petty Cash Management
            </Text>
            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-[0.1em] mt-1">
              Monthly Transactions & Expenses
            </Text>
          </div>
        </div>
      }
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-header]:!mb-6 [&_.ant-modal-header]:!border-b [&_.ant-modal-header]:!pb-4"
    >
      <div className="flex flex-col gap-8">
        {/* Form Section (Top) */}
        <div className="w-full space-y-6">
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-5 border-b border-gray-100 pb-2 flex items-center gap-2">
              <IconPlus size={14} /> New Expense
            </h3>
            <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} initialValues={{ type: "expense", paymentMethod: "cash", date: dayjs() }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="date" label="Date" rules={[{ required: true, message: "Required" }]}>
                    <DatePicker
                      className="w-full"
                      size="large"
                      format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        return current && (current.month() !== dayjs().month() || current.year() !== dayjs().year());
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                    <Select size="large">
                      <Select.Option value="expense">EXPENSE</Select.Option>
                      <Select.Option value="income">INCOME</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="amount" label="Amount (LKR)" rules={[{ required: true, message: "Required" }]}>
                    <InputNumber className="w-full" style={{ width: '100%' }} min={1} size="large" placeholder="0.00" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="category" label="Category" rules={[{ required: true, message: "Required" }]}>
                <Select placeholder="Select Category" size="large">
                  {categories.map((cat) => (
                    <Select.Option key={cat.id} value={cat.label}>
                      {cat.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="note" label="Note / Description" rules={[{ required: true, message: "Required" }]}>
                <Input.TextArea rows={3} placeholder="Enter details..." size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
                    <Select size="large">
                      <Select.Option value="cash">CASH</Select.Option>
                      <Select.Option value="card">CARD / ONLINE</Select.Option>
                      <Select.Option value="transfer">BANK TRANSFER</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Attachment (Optional)">
                <Upload
                  beforeUpload={() => false}
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                  maxCount={1}
                >
                  <Button icon={<IconFileUpload size={18} />} className="w-full h-11 rounded-xl border-dashed border-gray-300 hover:border-green-500 hover:text-green-600 transition-all">
                    Select Receipt / File
                  </Button>
                </Upload>
              </Form.Item>

              <Form.Item className="mb-0 mt-6">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="w-full h-12 bg-black hover:bg-gray-800 border-none rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all hover:scale-[1.02]"
                  icon={<IconPlus size={20} />}
                >
                  Save Transaction
                </Button>
              </Form.Item>
            </Form>
          </div>

          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-[10px] text-green-800 font-bold leading-relaxed shadow-sm">
            Note: Recent transactions update monthly reports. Ensure receipts are attached.
          </div>
        </div>

        <Divider className="m-0 border-gray-100" />

        {/* List Section (Bottom) */}
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-gray-800 flex items-center gap-2">
              <IconReceipt size={18} className="text-gray-400" />
              Transaction History
            </h3>
            <Tag color="green" className="rounded-full px-3 py-0.5 border-none font-bold text-[10px]">
              {expenses.length} Total
            </Tag>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <Table
              dataSource={expenses}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8, showSizeChanger: false, position: ["bottomRight"] }}
              size="middle"
              className="pos-table"
              locale={{
                emptyText: (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-300">
                    <IconReceipt size={48} stroke={1} />
                    <p className="mt-2 text-sm font-bold uppercase tracking-widest">No Transactions Found</p>
                  </div>
                )
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
