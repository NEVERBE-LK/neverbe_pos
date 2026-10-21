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
      width="min(1240px, 96vw)"
      footer={null}
      centered
      styles={{ body: { padding: 0 } }}
      title={
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
            <IconCash size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-neutral-400 font-mono">
              CASH MANAGEMENT
            </span>
            <Text className="text-lg font-black tracking-tight text-neutral-900 leading-none">
              Petty Cash & Expense Control
            </Text>
          </div>
        </div>
      }
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!p-0 [&_.ant-modal-content]:!overflow-hidden [&_.ant-modal-header]:!m-0 [&_.ant-modal-header]:!p-6 [&_.ant-modal-header]:!border-b [&_.ant-modal-header]:!border-neutral-100"
    >
      <div className="p-6 max-h-[calc(86vh-90px)] min-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Section (Left, 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-neutral-50/70 p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 border-b border-neutral-200/80 pb-2 flex items-center gap-2 font-mono">
                <IconPlus size={14} /> New Expense Transaction
              </h3>
              <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} initialValues={{ type: "expense", paymentMethod: "cash", date: dayjs() }}>
                <Row gutter={12}>
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

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="amount" label="Amount (LKR)" rules={[{ required: true, message: "Required" }]}>
                      <InputNumber className="w-full" style={{ width: '100%' }} min={1} size="large" placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
                      <Select size="large">
                        <Select.Option value="cash">CASH</Select.Option>
                        <Select.Option value="card">CARD / ONLINE</Select.Option>
                        <Select.Option value="transfer">BANK TRANSFER</Select.Option>
                      </Select>
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
                  <Input.TextArea rows={2} placeholder="Enter details..." size="large" />
                </Form.Item>

                <Form.Item label="Attachment (Optional)">
                  <Upload
                    beforeUpload={() => false}
                    fileList={fileList}
                    onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                    maxCount={1}
                  >
                    <Button icon={<IconFileUpload size={18} />} className="w-full h-10 rounded-xl border-dashed border-neutral-300 hover:border-black hover:text-black transition-all">
                      Select Receipt / File
                    </Button>
                  </Upload>
                </Form.Item>

                <Form.Item className="mb-0 mt-5">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-11 !bg-black hover:!bg-neutral-800 border-none rounded-xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-md shadow-black/10 transition-all hover:scale-[1.01]"
                    icon={<IconPlus size={18} />}
                  >
                    Save Transaction
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <div className="p-3.5 bg-neutral-100 border border-neutral-200/80 rounded-2xl text-[11px] text-neutral-600 font-medium leading-relaxed">
              Note: Recent transactions update monthly reports. Ensure receipts are attached for verification.
            </div>
          </div>

          {/* List Section (Right, 7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <IconReceipt size={16} className="text-neutral-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 font-mono">
                  Transaction History
                </h3>
              </div>
              <Tag color="green" className="rounded-full px-2.5 py-0.5 border-none font-bold text-[10px] font-mono">
                {expenses.length} Total
              </Tag>
            </div>

            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs">
              <Table
                dataSource={expenses}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 7, showSizeChanger: false, position: ["bottomRight"] }}
                size="small"
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
      </div>
    </Modal>
  );
}
