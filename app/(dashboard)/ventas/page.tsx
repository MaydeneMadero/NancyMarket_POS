"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Trash2, ShoppingCart, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const fetcher = (url: string) => fetch(url).then(r => r.json())
const IVA_RATE = 0.12

interface VentaItem { producto_id: string; cantidad: number; precio_unitario: number }
interface Producto { id: number; nombre: string; precio_venta: number; stock: number }
interface Venta {
  id: number; fecha: string; total: number; cliente: string; metodo_pago: string
  items: Array<{ id: number; producto: string; cantidad: number; precio_unitario: number; subtotal: number }>
}

export default function VentasPage() {
  const { data: ventas, isLoading, mutate } = useSWR<Venta[]>("/api/ventas", fetcher)
  const { data: productosData } = useSWR("/api/productos", fetcher)
  const productos: Producto[] = productosData?.productos || []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialog, setDetailDialog] = useState<Venta | null>(null)
  const [cliente, setCliente] = useState("Cliente General")
  const [metodoPago, setMetodoPago] = useState("efectivo")
  const [items, setItems] = useState<VentaItem[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [saving, setSaving] = useState(false)

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarProducto = (prod: Producto) => {
    const existe = items.findIndex(i => i.producto_id === String(prod.id))
    if (existe >= 0) {
      const updated = [...items]
      updated[existe].cantidad += 1
      setItems(updated)
    } else {
      setItems([...items, { producto_id: String(prod.id), cantidad: 1, precio_unitario: prod.precio_venta }])
    }
    setBusqueda("")
  }

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const updateCantidad = (index: number, val: number) => {
    const updated = [...items]
    updated[index].cantidad = val
    setItems(updated)
  }

  const subtotalSinIva = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const iva = subtotalSinIva * IVA_RATE
  const total = subtotalSinIva + iva

  const handleSubmit = async () => {
    if (!items.length || items.some(i => !i.producto_id)) return
    setSaving(true)
    try {
      await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente, metodo_pago: metodoPago,
          items: items.map(i => ({ producto_id: Number(i.producto_id), cantidad: Number(i.cantidad), precio_unitario: Number(i.precio_unitario) }))
        }),
      })
      mutate()
      setDialogOpen(false); setItems([]); setCliente("Cliente General"); setMetodoPago("efectivo")
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
          <p className="text-muted-foreground">Punto de venta y historial de transacciones</p>
        </div>
        <Button onClick={() => { setDialogOpen(true); setItems([]) }}>
          <Plus className="mr-2 size-4" />Nueva Venta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
          <CardDescription>{ventas?.length || 0} ventas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-8 text-muted-foreground">Cargando...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead><TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead><TableHead>Método</TableHead>
                    <TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas?.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">#{v.id}</TableCell>
                      <TableCell>{new Date(v.fecha).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                      <TableCell>{v.cliente || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{v.metodo_pago}</Badge></TableCell>
                      <TableCell>{v.items?.length || 0} items</TableCell>
                      <TableCell className="text-right font-medium">${Number(v.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setDetailDialog(v)}>Ver</Button></TableCell>
                    </TableRow>
                  ))}
                  {(!ventas || !ventas.length) && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay ventas registradas</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* POS Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="size-5" />Nueva Venta — Punto de Venta</DialogTitle>
            <DialogDescription>Busca productos y agrégalos a la venta</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente y método */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Cliente</Label><Input value={cliente} onChange={e => setCliente(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Método de Pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Buscador de productos */}
            <div className="space-y-2">
              <Label>Buscar Producto</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre del producto..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="pl-8"
                />
              </div>
              {busqueda && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-background shadow-sm">
                  {productosFiltrados.length ? productosFiltrados.map(p => (
                    <button key={p.id} onClick={() => agregarProducto(p)}
                      className="w-full flex justify-between items-center px-3 py-2 hover:bg-muted text-sm text-left">
                      <span>{p.nombre}</span>
                      <span className="text-muted-foreground">${Number(p.precio_venta).toFixed(2)} · Stock: {p.stock}</span>
                    </button>
                  )) : <p className="text-center text-sm text-muted-foreground py-3">Sin resultados</p>}
                </div>
              )}
            </div>

            {/* Lista de productos en carrito */}
            {items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24 text-center">Cant.</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const prod = productos.find(p => String(p.id) === item.producto_id)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-sm">{prod?.nombre || "—"}</TableCell>
                          <TableCell>
                            <Input type="number" min="1" value={item.cantidad}
                              onChange={e => updateCantidad(idx, Number(e.target.value))}
                              className="h-7 w-16 text-center mx-auto" />
                          </TableCell>
                          <TableCell className="text-right text-sm">${Number(item.precio_unitario).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="size-3 text-destructive" /></Button></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {!items.length && (
              <div className="border-2 border-dashed rounded-lg py-10 text-center text-muted-foreground text-sm">
                Busca y agrega productos para comenzar la venta
              </div>
            )}

            <Separator />

            {/* Subtotal / IVA / Total */}
            <div className="space-y-2 bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal (sin IVA)</span><span>${subtotalSinIva.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (12%)</span><span>${iva.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || !items.length} className="gap-2">
              <ShoppingCart className="size-4" />
              {saving ? "Registrando..." : "Finalizar Venta / Cobrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle venta */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venta #{detailDialog?.id}</DialogTitle>
            <DialogDescription>{detailDialog && new Date(detailDialog.fecha).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cliente:</span><span>{detailDialog?.cliente || "—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Método de Pago:</span><Badge variant="secondary">{detailDialog?.metodo_pago}</Badge></div>
            <Separator />
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">P. Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
              <TableBody>
                {detailDialog?.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.producto}</TableCell>
                    <TableCell className="text-center">{item.cantidad}</TableCell>
                    <TableCell className="text-right">${Number(item.precio_unitario).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(item.subtotal).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${(Number(detailDialog?.total || 0) / 1.12).toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>IVA 12%</span><span>${(Number(detailDialog?.total || 0) - Number(detailDialog?.total || 0) / 1.12).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>${Number(detailDialog?.total || 0).toFixed(2)}</span></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
