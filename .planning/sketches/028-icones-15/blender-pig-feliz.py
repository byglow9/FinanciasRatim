import bpy, math, sys
from mathutils import Vector
out = sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def lin(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4) for x in c)+(1,)
def mat(name, col, rough=0.5, sss=0.0, sssc=None, spec=0.5, coat=0.0, emit=None):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value=lin(col); b.inputs['Roughness'].default_value=rough
    for k,v in (('Subsurface Weight',sss),('Coat Weight',coat),('Specular IOR Level',spec)):
        if k in b.inputs: b.inputs[k].default_value=v
    if sssc and 'Subsurface Radius' in b.inputs: b.inputs['Subsurface Radius'].default_value=sssc
    if emit:
        b.inputs['Emission Color'].default_value=lin(emit); b.inputs['Emission Strength'].default_value=4
    return m
def smooth(o,lv=2,bev=None):
    bpy.context.view_layer.objects.active=o
    if bev:
        m=o.modifiers.new('b','BEVEL'); m.width=bev; m.segments=4
    m=o.modifiers.new('s','SUBSURF'); m.levels=lv; m.render_levels=lv
    bpy.ops.object.shade_smooth()
def sphere(name,loc,scale,m,rot=(0,0,0),lv=3):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=1,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.rotation_euler=rot
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
green=mat('green','#3f9a52',0.55,0.2,(0.3,0.6,0.3),0.4)
greenEar=mat('ear','#37894a',0.55,0.2,(0.3,0.6,0.3))
snoutM=mat('snout','#8fcf9d',0.45,0.35,(0.4,0.7,0.4),0.5)
nos=mat('nos','#1d4a2c',0.6)
eyeM=mat('eye','#0e2616',0.12,0,None,0.8,1.0)
glint=mat('glint','#ffffff',0.3,emit='#ffffff')
# cabeca
sphere('head',(0,0,-0.03),(1.0,0.86,0.80),green)
# orelhas de porco: triangulares, caidas para a frente e para fora
for sx in (-1,1):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=0.44,radius2=0.2,depth=0.6,location=(sx*0.6,-0.1,0.6))
    e=bpy.context.object; e.name='ear'; e.data.materials.append(greenEar)
    e.scale=(1.0,0.38,1.0)
    e.rotation_euler=(math.radians(-22),math.radians(sx*46),0)
    smooth(e,2,0.2)
# focinho
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=0.34,depth=0.22,location=(0,-0.80,-0.17))
sn=bpy.context.object; sn.name='snout'; sn.rotation_euler=(math.radians(90),0,0); sn.scale=(1.0,1.0,1.0)
sn.data.materials.append(snoutM); sn.scale=(1.0,1.0,1.0)
smooth(sn,2,0.07)
sn.scale=(1.0,1.0,0.8)
sn.scale=(1.0,1.0,1.0)
for sx in (-1,1):
    sphere('nostril',(sx*0.115,-0.935,-0.16),(0.055,0.03,0.085),nos)
# olhos felizes: arcos fechados (^ ^) em tubo fino, com pontas redondas
eyeMat=mat('eyearc','#12301c',0.55,0,None,0.2)
def arc_eye(sx):
    cu=bpy.data.curves.new('arc','CURVE'); cu.dimensions='3D'
    cu.bevel_depth=0.052; cu.bevel_resolution=8; cu.use_fill_caps=True
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(2)
    pts=[(-0.15,0,-0.05),(0,0,0.085),(0.15,0,-0.05)]
    for bp,p in zip(sp.bezier_points,pts):
        bp.co=p; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    o=bpy.data.objects.new('arc',cu); sc.collection.objects.link(o)
    o.location=(sx*0.37,-0.772,0.19); o.rotation_euler=(math.radians(-8),0,math.radians(sx*22))
    o.data.materials.append(eyeMat)
    for p in (pts[0],pts[2]):
        pass
for sx in (-1,1):
    arc_eye(sx)
    bl=mat('blush','#f2a58e',0.7)
    sphere('blush',(sx*0.6,-0.66,-0.08),(0.13,0.045,0.095),bl)
# mundo e luzes
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
bg=w.node_tree.nodes['Background']; bg.inputs['Color'].default_value=(0.55,0.62,0.58,1); bg.inputs['Strength'].default_value=0.5
def area(name,loc,energy,size,col=(1,1,1)):
    d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.size=size; d.color=col
    o=bpy.data.objects.new(name,d); sc.collection.objects.link(o); o.location=loc
    t=bpy.data.objects.new(name+'t',None); sc.collection.objects.link(t); t.location=(0,0,0)
    c=o.constraints.new('TRACK_TO'); c.target=t; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
area('key',(-3,-4,4),520,3.5,(1,0.97,0.92))
area('fill',(4,-3,1),180,4,(0.85,0.95,1))
area('rim',(2.5,3,3.5),420,3,(0.9,1,0.9))
area('top',(0,-1,5),120,4)
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=2.35
co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(0,-6,0.9)
t=bpy.data.objects.new('ct',None); sc.collection.objects.link(t); t.location=(0,0,0.12)
c=co.constraints.new('TRACK_TO'); c.target=t; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
sc.render.engine='CYCLES'; sc.cycles.samples=96; sc.cycles.device='CPU'
try: sc.cycles.use_denoising=True
except: pass
sc.view_settings.view_transform='Standard'; sc.view_settings.look='None'
sc.render.film_transparent=True
sc.render.resolution_x=1024; sc.render.resolution_y=1024; sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
sc.render.filepath=out
bpy.ops.render.render(write_still=True)
