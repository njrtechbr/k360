"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { type Attendant, ATTENDANT_STATUS } from "@/lib/types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  funcao: z
    .string({ required_error: "A função é obrigatória." })
    .min(2, { message: "A função é obrigatória." }),
  setor: z
    .string({ required_error: "O setor é obrigatório." })
    .min(2, { message: "O setor é obrigatório." }),
  status: z.nativeEnum(ATTENDANT_STATUS),
  avatarUrl: z.any(),
  telefone: z
    .string()
    .min(10, { message: "O telefone deve ter pelo menos 10 dígitos." }),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date({ required_error: "A data de admissão é obrigatória." }),
  dataNascimento: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
  rg: z.string().min(5, { message: "O RG é obrigatório." }),
  cpf: z.string().min(11, { message: "O CPF é obrigatório." }),
});

const defaultFormValues = {
  name: "",
  email: "",
  funcao: "" as any,
  setor: "" as any,
  status: ATTENDANT_STATUS.ACTIVE,
  avatarUrl: "",
  telefone: "",
  portaria: "",
  situacao: "",
  rg: "",
  cpf: "",
  dataAdmissao: undefined,
  dataNascimento: undefined,
};

interface AttendantFormProps {
  attendant?: Attendant | null;
  funcoes: string[];
  setores: string[];
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
  if (!match) return cpf;
  return (
    [match[1], match[2], match[3]].filter(Boolean).join(".") +
    (match[4] ? `-${match[4]}` : "")
  );
};

const formatTelefone = (tel: string) => {
  const cleaned = tel.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

export default function AttendantForm({
  attendant,
  funcoes,
  setores,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AttendantFormProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (attendant) {
      form.reset({
        ...attendant,
        cpf: formatCPF(attendant.cpf),
        telefone: formatTelefone(attendant.telefone),
        avatarUrl: null, // Clear file input on open
        dataAdmissao: new Date(attendant.dataAdmissao),
        dataNascimento: new Date(attendant.dataNascimento),
      });
      setAvatarPreview(attendant.avatarUrl);
    } else {
      form.reset(defaultFormValues);
      setAvatarPreview(null);
    }
  }, [attendant, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      let avatarUrl = attendant?.avatarUrl || "";
      if (values.avatarUrl && values.avatarUrl[0]) {
        avatarUrl = await fileToDataUrl(values.avatarUrl[0]);
      }

      const dataToSave = {
        ...values,
        cpf: values.cpf.replace(/\D/g, ""), // Save unformatted CPF
        telefone: values.telefone.replace(/\D/g, ""), // Save unformatted phone
        avatarUrl,
        dataAdmissao: values.dataAdmissao.toISOString(),
        dataNascimento: values.dataNascimento.toISOString(),
      };

      await onSubmit(dataToSave);
    } catch (error) {
      // Error handling is done by parent component
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6 pl-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) =>
                      field.onChange(formatTelefone(e.target.value))
                    }
                    maxLength={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="funcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {funcoes.map((funcao) => (
                      <SelectItem key={funcao} value={funcao}>
                        {funcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="setor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {setores.map((setor) => (
                      <SelectItem
                        key={setor}
                        value={setor}
                        className="capitalize"
                      >
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ATTENDANT_STATUS).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => field.onChange(formatCPF(e.target.value))}
                    maxLength={14}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RG</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataNascimento"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel>Data de Nascimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataAdmissao"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel>Data de Admissão</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="situacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situação</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="portaria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Informações de Portaria</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="md:col-span-1 lg:col-span-3">
                <FormLabel>Avatar</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview ?? undefined} />
                    <AvatarFallback>
                      <UserCircle className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      className="max-w-xs"
                      onChange={(e) => {
                        field.onChange(e.target.files);
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAvatarPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </FormControl>
                </div>
                <FormDescription>
                  {attendant
                    ? "Faça upload de uma nova foto para alterar o avatar."
                    : "Faça upload da foto do atendente."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-8">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Atendente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
