import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { studentService, groupService, contractService } from '@/services/api.service';
import type { GroupRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { Loader2, UserPlus, FileText, Upload, Calendar } from 'lucide-react';

interface StudentWithContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface StudentFormData {
  // Basic Student Data
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  status: 'active' | 'graduated' | 'dropped' | 'suspended';
  group_id: number | string;

  // Contract Data - Basic
  contract_number: string;
  student_fio: string;
  birth_year: string;
  student_address: string;

  // Contract Data - Parents (Dad)
  dad_passport: string;
  dad_who_give: string;
  dad_when_give: string;

  // Contract Data - Parents (Mom)
  mom_passport: string;
  mom_who_give: string;
  mom_when_give: string;

  // Contract Data - Sana (Date)
  sana_kun: string;
  sana_oy: string;
  sana_yil: string;

  // Contract Data - Buyurtmachi (Customer)
  buyurtmachi_passport_series_number: string;
  buyurtmachi_who_give: string;
  buyurtmachi_when_give: string;
  buyurtmachi_address: string;
  buyurtmachi_phone: string;

  // Contract Data - Tarbiyalanuvchi (Student)
  tarbiyalanuvchi_birth_series_number: string;
  tarbiyalanuvchi_birth_year: string;
  tarbiyalanuvchi_home_address: string;

  // Contract Data - Shartnoma muddati (Contract period)
  shartnoma_muddati_kun: string;
  shartnoma_muddati_oy: string;
  shartnoma_muddati_yil: string;

  // Contract Data - To'lov (Payment)
  tolov_monthly_fee: number | string;
  tolov_discount_percentage: number | string;
  tolov_discount_amount: number | string;

  // Files - All required
  passport_copy: FileList;
  form_086: FileList;
  heart_checkup: FileList;
  birth_certificate: FileList;
  contract_image_1: FileList;
  contract_image_2: FileList;
}

export function StudentWithContractDialog({
  open,
  onOpenChange,
  onSuccess,
}: StudentWithContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedContractNumber, setSuggestedContractNumber] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>();

  const selectedGroupId = watch('group_id');
  const birthYear = watch('birth_year');

  const { data: groupsData } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  // Get suggested contract number when group and birth year are selected
  useEffect(() => {
    const fetchContractNumber = async () => {
      if (selectedGroupId && birthYear && birthYear.length === 4) {
        try {
          const response = await contractService.getNextAvailableNumber(
            Number(selectedGroupId),
            Number(birthYear)
          );
          if (response.data.contract_number) {
            setSuggestedContractNumber(response.data.contract_number);
            // Auto-fill contract number
            setValue('contract_number', response.data.contract_number);
            toast.success(`Taklif: ${response.data.contract_number}`, { duration: 3000 });
          } else if (response.data.is_full) {
            toast.error('Bu guruh to\'lgan! Boshqa guruh tanlang.');
          }
        } catch (error) {
          console.error('Shartnoma raqamini olishda xatolik:', error);
        }
      }
    };

    fetchContractNumber();
  }, [selectedGroupId, birthYear, setValue]);

  useEffect(() => {
    if (open) {
      reset({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        phone: '',
        address: '',
        status: 'active',
        group_id: '',
        contract_number: '',
        student_fio: '',
        birth_year: '',
        student_address: '',
        dad_passport: '',
        dad_who_give: '',
        dad_when_give: '',
        mom_passport: '',
        mom_who_give: '',
        mom_when_give: '',
        sana_kun: '',
        sana_oy: '',
        sana_yil: '',
        buyurtmachi_passport_series_number: '',
        buyurtmachi_who_give: '',
        buyurtmachi_when_give: '',
        buyurtmachi_address: '',
        buyurtmachi_phone: '',
        tarbiyalanuvchi_birth_series_number: '',
        tarbiyalanuvchi_birth_year: '',
        tarbiyalanuvchi_home_address: '',
        shartnoma_muddati_kun: '',
        shartnoma_muddati_oy: '',
        shartnoma_muddati_yil: '',
        tolov_monthly_fee: '',
        tolov_discount_percentage: '0',
        tolov_discount_amount: '0',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsSubmitting(true);

      // Validate phone number format
      const phoneRegex = /^\+998\d{9}$/;
      if (!phoneRegex.test(data.phone)) {
        toast.error('Telefon raqam noto\'g\'ri formatda! Namuna: +998901234567');
        return;
      }

      if (data.buyurtmachi_phone && !phoneRegex.test(data.buyurtmachi_phone)) {
        toast.error('Buyurtmachi telefon raqami noto\'g\'ri formatda! Namuna: +998901234567');
        return;
      }

      // Prepare student_data JSON
      const student_data = {
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        address: data.address || '',
        status: data.status,
        group_id: data.group_id ? Number(data.group_id) : null,
      };

      // Prepare contract_data JSON with nested structure
      const contract_data = {
        contract_number: data.contract_number,
        student_fio: data.student_fio,
        birth_year: data.birth_year,
        student_address: data.student_address,
        dad_passport: data.dad_passport || '',
        dad_who_give: data.dad_who_give || '',
        dad_when_give: data.dad_when_give || '',
        mom_passport: data.mom_passport || '',
        mom_who_give: data.mom_who_give || '',
        mom_when_give: data.mom_when_give || '',
        sana: {
          kun: data.sana_kun,
          oy: data.sana_oy,
          yil: data.sana_yil,
        },
        boshlanish: {
          kun: data.sana_kun,
          oy: data.sana_oy,
          yil: data.sana_yil,
        },
        buyurtmachi: {
          passport_series_number: data.buyurtmachi_passport_series_number,
          who_give: data.buyurtmachi_who_give || '',
          when_give: data.buyurtmachi_when_give || '',
          address: data.buyurtmachi_address || '',
          phone: data.buyurtmachi_phone,
        },
        tarbiyalanuvchi: {
          birth_series_number: data.tarbiyalanuvchi_birth_series_number || '',
          tugilganlik_yil: data.tarbiyalanuvchi_birth_year || '',
          home_address: data.tarbiyalanuvchi_home_address || '',
        },
        shartnoma_muddati: {
          kun: data.shartnoma_muddati_kun || '',
          oy: data.shartnoma_muddati_oy || '',
          yil: data.shartnoma_muddati_yil || '',
        },
        tolov: {
          monthly_fee: Number(data.tolov_monthly_fee),
          discount_percentage: Number(data.tolov_discount_percentage) || 0,
          discount_amount: Number(data.tolov_discount_amount) || 0,
        },
      };

      // Build FormData
      const formData = new FormData();
      formData.append('student_data', JSON.stringify(student_data));
      formData.append('contract_data', JSON.stringify(contract_data));

      // Append required files
      if (data.passport_copy?.[0]) {
        formData.append('passport_copy', data.passport_copy[0]);
      } else {
        toast.error('Pasport nusxasi majburiy!');
        return;
      }

      if (data.form_086?.[0]) {
        formData.append('form_086', data.form_086[0]);
      } else {
        toast.error('086 Forma majburiy!');
        return;
      }

      if (data.heart_checkup?.[0]) {
        formData.append('heart_checkup', data.heart_checkup[0]);
      } else {
        toast.error('Yurak tekshiruvi majburiy!');
        return;
      }

      if (data.birth_certificate?.[0]) {
        formData.append('birth_certificate', data.birth_certificate[0]);
      } else {
        toast.error('Tug\'ilganlik guvohnomasi majburiy!');
        return;
      }

      // Append required contract images
      if (data.contract_image_1?.[0]) {
        formData.append('contract_image_1', data.contract_image_1[0]);
      } else {
        toast.error('Shartnoma rasmi 1 majburiy!');
        return;
      }

      if (data.contract_image_2?.[0]) {
        formData.append('contract_image_2', data.contract_image_2[0]);
      } else {
        toast.error('Shartnoma rasmi 2 majburiy!');
        return;
      }

      // Call API and get PDF blob
      const blob = await studentService.createStudentWithContract(formData);

      // Download the PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shartnoma_${data.contract_number}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('O\'quvchi va shartnoma muvaffaqiyatli yaratildi! PDF yuklab olindi.');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      // Close dialog and call success callback
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Xatolik:', error);
      console.error('Error Response:', error.response);
      console.error('Error Response Data:', error.response?.data);

      let detail = error.response?.data?.detail;
      let errorMessage = 'Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.';

      // If response data is a Blob, convert it to text to read the error
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          console.error('Blob Error Content:', text);
          const errorData = JSON.parse(text);
          detail = errorData.detail;
          console.error('Parsed Error Detail:', detail);
        } catch (blobError) {
          console.error('Could not parse blob error:', blobError);
        }
      }

      if (Array.isArray(detail) && detail.length > 0) {
        // FastAPI validation errors
        const errorMessages = detail.map((err: any) => {
          const field = err.loc?.[err.loc.length - 1] || 'maydon';
          return `${field}: ${err.msg}`;
        }).join(', ');
        errorMessage = errorMessages;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border-2 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            O'quvchi va Shartnoma yaratish
          </DialogTitle>
          <DialogDescription>
            Yangi o'quvchi ma'lumotlarini va shartnoma ma'lumotlarini bir vaqtning o'zida kiriting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* SECTION 1: Basic Student Information */}
          <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">1. O'quvchi ma'lumotlari</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first_name">
                  Ism <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'Ism kiritish majburiy' })}
                  placeholder="Ismni kiriting"
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="last_name">
                  Familiya <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'Familiya kiritish majburiy' })}
                  placeholder="Familiyani kiriting"
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date_of_birth">
                  Tug'ilgan sana <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register('date_of_birth', { required: 'Tug\'ilgan sana majburiy' })}
                />
                {errors.date_of_birth && (
                  <p className="text-xs text-red-500 mt-1">{errors.date_of_birth.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">
                  Telefon raqam <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  {...register('phone', {
                    required: 'Telefon raqam majburiy',
                    pattern: {
                      value: /^\+998\d{9}$/,
                      message: 'Telefon raqam noto\'g\'ri formatda. Namuna: +998901234567'
                    }
                  })}
                  placeholder="+998901234567"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Manzil</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="O'quvchi manzilini kiriting"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="status">
                  Holat <span className="text-red-500">*</span>
                </Label>
                <select
                  id="status"
                  {...register('status', { required: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Faol</option>
                  <option value="graduated">Bitirgan</option>
                  <option value="dropped">Tark etgan</option>
                  <option value="suspended">To'xtatilgan</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="group_id">Guruh</Label>
                <select
                  id="group_id"
                  {...register('group_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Guruhni tanlang</option>
                  {groupsData?.data?.map((group: GroupRead) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Contract Data */}
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">2. Shartnoma ma'lumotlari</h3>
            </div>

            {/* Contract Number */}
            <div className="space-y-1">
              <Label htmlFor="contract_number">
                Shartnoma raqami <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contract_number"
                {...register('contract_number', { required: 'Shartnoma raqami majburiy' })}
                placeholder="Guruh va yilni tanlang"
              />
              {suggestedContractNumber && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Taklif etilgan raqam: {suggestedContractNumber}
                </p>
              )}
              {errors.contract_number && (
                <p className="text-xs text-red-500 mt-1">{errors.contract_number.message}</p>
              )}
            </div>

            {/* Student Info for Contract */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="student_fio">
                  O'quvchi F.I.O. <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="student_fio"
                  {...register('student_fio', { required: 'F.I.O. majburiy' })}
                  placeholder="To'liq ism familiya"
                />
                {errors.student_fio && (
                  <p className="text-xs text-red-500 mt-1">{errors.student_fio.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="birth_year">
                  Tug'ilgan yili <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birth_year"
                  {...register('birth_year', { required: 'Yil majburiy' })}
                  placeholder="2010"
                />
                {errors.birth_year && (
                  <p className="text-xs text-red-500 mt-1">{errors.birth_year.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="student_address">
                O'quvchi manzili <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="student_address"
                {...register('student_address', { required: 'Manzil majburiy' })}
                placeholder="To'liq manzil"
                rows={2}
              />
              {errors.student_address && (
                <p className="text-xs text-red-500 mt-1">{errors.student_address.message}</p>
              )}
            </div>

            {/* Dad Passport Info */}
            <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Ota pasport ma'lumotlari</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dad_passport" className="text-xs">Passport</Label>
                  <Input
                    id="dad_passport"
                    {...register('dad_passport')}
                    placeholder="AA1234567"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dad_who_give" className="text-xs">Kim tomonidan</Label>
                  <Input
                    id="dad_who_give"
                    {...register('dad_who_give')}
                    placeholder="IIB"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dad_when_give" className="text-xs">Qachon berilgan</Label>
                  <Input
                    id="dad_when_give"
                    type="date"
                    {...register('dad_when_give')}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Mom Passport Info */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Ona pasport ma'lumotlari</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mom_passport" className="text-xs">Passport</Label>
                  <Input
                    id="mom_passport"
                    {...register('mom_passport')}
                    placeholder="AA1234567"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mom_who_give" className="text-xs">Kim tomonidan</Label>
                  <Input
                    id="mom_who_give"
                    {...register('mom_who_give')}
                    placeholder="IIB"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mom_when_give" className="text-xs">Qachon berilgan</Label>
                  <Input
                    id="mom_when_give"
                    type="date"
                    {...register('mom_when_give')}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Sana (Date) */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Shartnoma sanasi</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sana_kun" className="text-xs">Kun <span className="text-red-500">*</span></Label>
                  <Input
                    id="sana_kun"
                    {...register('sana_kun', { required: 'Kun majburiy' })}
                    placeholder="15"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sana_oy" className="text-xs">Oy <span className="text-red-500">*</span></Label>
                  <Input
                    id="sana_oy"
                    {...register('sana_oy', { required: 'Oy majburiy' })}
                    placeholder="Yanvar"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sana_yil" className="text-xs">Yil <span className="text-red-500">*</span></Label>
                  <Input
                    id="sana_yil"
                    {...register('sana_yil', { required: 'Yil majburiy' })}
                    placeholder="2025"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Buyurtmachi (Customer) */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Buyurtmachi ma'lumotlari</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="buyurtmachi_passport_series_number" className="text-xs">
                      Passport seriya va raqam <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="buyurtmachi_passport_series_number"
                      {...register('buyurtmachi_passport_series_number', { required: 'Passport majburiy' })}
                      placeholder="AA1234567"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyurtmachi_phone" className="text-xs">
                      Telefon <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="buyurtmachi_phone"
                      {...register('buyurtmachi_phone', {
                        required: 'Telefon majburiy',
                        pattern: {
                          value: /^\+998\d{9}$/,
                          message: 'Telefon noto\'g\'ri formatda. Namuna: +998901234567'
                        }
                      })}
                      placeholder="+998901234567"
                      className="h-9"
                    />
                    {errors.buyurtmachi_phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.buyurtmachi_phone.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="buyurtmachi_who_give" className="text-xs">Kim tomonidan berilgan</Label>
                    <Input
                      id="buyurtmachi_who_give"
                      {...register('buyurtmachi_who_give')}
                      placeholder="IIB"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyurtmachi_when_give" className="text-xs">Qachon berilgan</Label>
                    <Input
                      id="buyurtmachi_when_give"
                      type="date"
                      {...register('buyurtmachi_when_give')}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="buyurtmachi_address" className="text-xs">Manzil</Label>
                  <Textarea
                    id="buyurtmachi_address"
                    {...register('buyurtmachi_address')}
                    placeholder="To'liq manzil"
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tarbiyalanuvchi (Student Birth Certificate) */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Tarbiyalanuvchi ma'lumotlari</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tarbiyalanuvchi_birth_series_number" className="text-xs">
                    Tug'ilganlik seriya va raqam
                  </Label>
                  <Input
                    id="tarbiyalanuvchi_birth_series_number"
                    {...register('tarbiyalanuvchi_birth_series_number')}
                    placeholder="I-AA 1234567"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tarbiyalanuvchi_birth_year" className="text-xs">Tug'ilgan yili</Label>
                  <Input
                    id="tarbiyalanuvchi_birth_year"
                    {...register('tarbiyalanuvchi_birth_year')}
                    placeholder="2010"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tarbiyalanuvchi_home_address" className="text-xs">Uy manzili</Label>
                  <Input
                    id="tarbiyalanuvchi_home_address"
                    {...register('tarbiyalanuvchi_home_address')}
                    placeholder="Uy manzil"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Shartnoma muddati (Contract Period) */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">Shartnoma muddati</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="shartnoma_muddati_kun" className="text-xs">Kun</Label>
                  <Input
                    id="shartnoma_muddati_kun"
                    {...register('shartnoma_muddati_kun')}
                    placeholder="15"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shartnoma_muddati_oy" className="text-xs">Oy</Label>
                  <Input
                    id="shartnoma_muddati_oy"
                    {...register('shartnoma_muddati_oy')}
                    placeholder="Dekabr"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shartnoma_muddati_yil" className="text-xs">Yil</Label>
                  <Input
                    id="shartnoma_muddati_yil"
                    {...register('shartnoma_muddati_yil')}
                    placeholder="2025"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* To'lov (Payment) */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-md border">
              <h4 className="font-semibold mb-3 text-sm">To'lov ma'lumotlari</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tolov_monthly_fee" className="text-xs">
                    Oylik to'lov (UZS) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tolov_monthly_fee"
                    type="number"
                    {...register('tolov_monthly_fee', { required: 'Oylik to\'lov majburiy' })}
                    placeholder="500000"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tolov_discount_percentage" className="text-xs">Chegirma %</Label>
                  <Input
                    id="tolov_discount_percentage"
                    type="number"
                    {...register('tolov_discount_percentage')}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tolov_discount_amount" className="text-xs">Chegirma miqdori</Label>
                  <Input
                    id="tolov_discount_amount"
                    type="number"
                    {...register('tolov_discount_amount')}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: All Required Images/Documents */}
          <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">3. Barcha hujjatlar va rasmlar</h3>
            </div>

            {/* Profile Image (Contract Image 1) - First */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <div className="space-y-1">
                <Label htmlFor="contract_image_1" className="text-base font-semibold text-blue-700 dark:text-blue-400">
                  📸 Profil rasmi (Shartnoma rasmi 1) <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Bu rasm o'quvchining profil rasmi sifatida ko'rsatiladi</p>
                <Input
                  id="contract_image_1"
                  type="file"
                  accept="image/*"
                  {...register('contract_image_1', { required: 'Profil rasmi majburiy' })}
                  className="cursor-pointer"
                />
                {errors.contract_image_1 && (
                  <p className="text-xs text-red-500 mt-1">{errors.contract_image_1.message}</p>
                )}
              </div>
            </div>

            {/* All Other Images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="contract_image_2">
                  Shartnoma rasmi 2 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contract_image_2"
                  type="file"
                  accept="image/*"
                  {...register('contract_image_2', { required: 'Shartnoma rasmi 2 majburiy' })}
                  className="cursor-pointer"
                />
                {errors.contract_image_2 && (
                  <p className="text-xs text-red-500 mt-1">{errors.contract_image_2.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="passport_copy">
                  Pasport nusxasi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="passport_copy"
                  type="file"
                  accept="image/*,application/pdf"
                  {...register('passport_copy', { required: 'Pasport nusxasi majburiy' })}
                  className="cursor-pointer"
                />
                {errors.passport_copy && (
                  <p className="text-xs text-red-500 mt-1">{errors.passport_copy.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="form_086">
                  086 Forma <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="form_086"
                  type="file"
                  accept="image/*,application/pdf"
                  {...register('form_086', { required: '086 forma majburiy' })}
                  className="cursor-pointer"
                />
                {errors.form_086 && (
                  <p className="text-xs text-red-500 mt-1">{errors.form_086.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="heart_checkup">
                  Yurak tekshiruvi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="heart_checkup"
                  type="file"
                  accept="image/*,application/pdf"
                  {...register('heart_checkup', { required: 'Yurak tekshiruvi majburiy' })}
                  className="cursor-pointer"
                />
                {errors.heart_checkup && (
                  <p className="text-xs text-red-500 mt-1">{errors.heart_checkup.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="birth_certificate">
                  Tug'ilganlik guvohnomasi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birth_certificate"
                  type="file"
                  accept="image/*,application/pdf"
                  {...register('birth_certificate', { required: 'Tug\'ilganlik guvohnomasi majburiy' })}
                  className="cursor-pointer"
                />
                {errors.birth_certificate && (
                  <p className="text-xs text-red-500 mt-1">{errors.birth_certificate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isSubmitting && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-sm text-blue-700 font-medium">
                  O'quvchi va shartnoma yaratilmoqda, PDF fayl tayyorlanmoqda...
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  O'quvchi va Shartnoma yaratish
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
