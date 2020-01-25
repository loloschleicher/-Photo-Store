const path = require('path')
const fs = require('fs');

/**
 * SesionController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  inicioSesion: async (peticion, respuesta) => {
    respuesta.view('pages/admin/inicio_sesion')
  },

  procesarInicioSesion: async (peticion, respuesta) => {
    let admin = await Admin.findOne({ email: peticion.body.email, contrasena: peticion.body.contrasena })
    console.log(admin)
    if (admin) {
      if(admin.estado){
        peticion.session.admin = admin
        peticion.session.cliente = undefined
        peticion.addFlash('mensaje', 'Sesión de admin iniciada')
        return respuesta.redirect("/admin/principal")
      }else{
      peticion.addFlash('mensaje', 'Usuario inactivo')
      return respuesta.redirect("/admin/inicio-sesion");
    }     
    }
    else {
      peticion.addFlash('mensaje', 'Email o contraseña invalidos')
      return respuesta.redirect("/admin/inicio-sesion");
    }
  },

  principal: async (peticion, respuesta) => {
    if (!peticion.session || !peticion.session.admin) {
      peticion.addFlash('mensaje', 'Sesión inválida')
      return respuesta.redirect("/admin/inicio-sesion")
    }
    let fotos = await Foto.find().sort("id")
    respuesta.view('pages/admin/principal', { fotos })
  },

  cerrarSesion: async (peticion, respuesta) => {
    peticion.session.admin = undefined
    peticion.addFlash('mensaje', 'Sesión finalizada')
    return respuesta.redirect("/");
  },

  agregarFoto: async (peticion, respuesta) => {
    respuesta.view('pages/admin/agregar_foto')
  },

  procesarAgregarFoto: async (peticion, respuesta) => {
    let foto = await Foto.create({
      titulo: peticion.body.titulo,
      activa: true
    }).fetch()
    peticion.file('foto').upload({}, async (error, archivos) => {
      if (archivos && archivos[0]) {
        let upload_path = archivos[0].fd
        let ext = path.extname(upload_path)

        await fs.createReadStream(upload_path).pipe(fs.createWriteStream(path.resolve(sails.config.appPath, `assets/images/fotos/${foto.id}${ext}`)))
        await Foto.update({ id: foto.id }, { contenido: `${foto.id}${ext}` })
        peticion.addFlash('mensaje', 'Foto agregada')
        return respuesta.redirect("/admin/principal")
      }
      peticion.addFlash('mensaje', 'No hay foto seleccionada')
      return respuesta.redirect("/admin/agregar-foto")
    })
  },

  desactivarFoto: async (peticion, respuesta) => {
    await Foto.update({id: peticion.params.fotoId}, {activa: false})
    peticion.addFlash('mensaje', 'Foto desactivada')
    return respuesta.redirect("/admin/principal")
  },

  activarFoto: async (peticion, respuesta) => {
    await Foto.update({id: peticion.params.fotoId}, {activa: true})
    peticion.addFlash('mensaje', 'Foto activada')
    return respuesta.redirect("/admin/principal")
  },

  clientes: async (peticion, respuesta) => {
   /* let clientes = await Cliente.find();*/
   let consulta = `
   SELECT *
    FROM cliente 
 `
 await Cliente.query(consulta, [], (errores, resultado) => {
  let clientes = resultado.rows
  respuesta.view("pages/admin/clientes", {clientes})
  })
},

  clientesOrdenes: async (peticion, respuesta) => {
 /*   let ordenes = await Orden.findOne({ cliente_id: peticion.params.id_cliente });
    return respuesta.view("pages/admin/ordenes", {ordenes})*/
    let consulta = `
    SELECT
    *
  FROM
    orden
    WHERE cliente_id = ${peticion.params.id_cliente}
  `
  let cliente = await Cliente.findOne({id: peticion.params.id_cliente});
  await Orden.query(consulta, [], (errores, resultado) => {
    let ordenes = resultado.rows
    respuesta.view("pages/admin/ordenes", {ordenes, cliente})

  })
  },

  detallesOrdenes: async (peticion, respuesta) => {
    /*   let ordenes = await Orden.findOne({ cliente_id: peticion.params.id_cliente });
       return respuesta.view("pages/admin/ordenes", {ordenes})*/
       let consulta = `
       SELECT
       *
     FROM
       orden_detalle
       INNER JOIN foto ON orden_detalle.foto_id = foto.id
       WHERE orden_detalle.orden_id = ${peticion.params.id_orden}
     `
     //let cliente = await Cliente.findOne({id: peticion.params.id_orden});
     await OrdenDetalle.query(consulta, [], (errores, resultado) => {
       let ordenDetalles = resultado.rows
       respuesta.view("pages/admin/orden_detalles", {ordenDetalles})
   
     })
     },

     estadoCliente: async (peticion, respuesta) => {
      /*   let ordenes = await Orden.findOne({ cliente_id: peticion.params.id_cliente });
         return respuesta.view("pages/admin/ordenes", {ordenes})*/
         let consulta = `
         UPDATE public.cliente 
          SET estado = not (select estado from public.cliente where public.cliente.id = ${peticion.params.id_cliente} )
            WHERE public.cliente.id = ${peticion.params.id_cliente}           
       `
       
       await Cliente.query(consulta, [], (errores, resultado) => {
        return respuesta.redirect("/admin/clientes") 
       })
       },

       administradores: async (peticion, respuesta) => {
        let consulta = `
        SELECT *
         FROM admin 
      `
      
      await Admin.query(consulta, [], (errores, resultado) => {
       let administradores = resultado.rows
       respuesta.view("pages/admin/administradores", {administradores})
       })
      },

      estadoAdmin: async (peticion, respuesta) => {
        /*   let ordenes = await Orden.findOne({ cliente_id: peticion.params.id_cliente });
           return respuesta.view("pages/admin/ordenes", {ordenes})*/
           if(peticion.params.id_admin == peticion.session.admin.id ){
            peticion.addFlash('mensaje', 'No puedes desactivarte a ti mismo')
           }
           let consulta = `
           UPDATE public.admin 
            SET estado = not (select estado from public.admin where public.admin.id = ${peticion.params.id_admin} )
              WHERE public.admin.id = ${peticion.params.id_admin}    and public.admin.id != ${peticion.session.admin.id }   
         `
         await Admin.query(consulta, [], (errores, resultado) => {
          return respuesta.redirect("/admin/administradores") 
         })
         },

         dashboard: async (peticion, respuesta) => {
          let totalClientes = await Cliente.count();
          let totalFotos = await Foto.count();
          let totalAdministradores = await Admin.count();
          let totalOrdenes = await Orden.count();
          respuesta.view("pages/admin/dashboard", {totalClientes, totalFotos, totalAdministradores, totalOrdenes})
        },


};

