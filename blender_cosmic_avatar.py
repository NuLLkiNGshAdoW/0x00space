import bpy
import math
from mathutils import Vector

# Rebuild a clean, editable Blender scene.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
    pass

def mat(name, color, metallic=0.0, roughness=0.72):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    bs = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(bs.outputs['BSDF'], output.inputs['Surface'])
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    return m

teal = mat('Helmet • sea-glass teal', (0.12, 0.68, 0.63), 0.22)
teal_light = mat('Mint highlights', (0.36, 0.91, 0.79), 0.12)
teal_dark = mat('Deep petrol', (0.035, 0.25, 0.27), 0.25)
skin = mat('Warm ivory face', (0.96, 0.79, 0.60))
coat = mat('Charcoal plum coat', (0.19, 0.18, 0.23))
coat_light = mat('Coat seams', (0.34, 0.31, 0.38))
black = mat('Pixel details', (0.045, 0.07, 0.085))
white = mat('Eye glints', (0.93, 0.95, 0.82))
coral = mat('Coral accents', (0.94, 0.25, 0.43), 0.1)
gold = mat('Warm brass', (0.94, 0.63, 0.27), 0.5, 0.4)
groundmat = mat('Midnight backdrop', (0.025, 0.055, 0.10), 0.12)

def cube(name, loc, scale, material, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material: o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('Tiny softened pixel edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        o.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return o

# Feet, squared trousers, and a long, tailored coat.
cube('Left boot', (-0.47, -0.01, 0.28), (0.62, 0.87, 0.43), black)
cube('Right boot', (0.47, -0.01, 0.28), (0.62, 0.87, 0.43), black)
cube('Left trouser leg', (-0.46, 0.05, 0.83), (0.57, 0.62, 0.85), coat)
cube('Right trouser leg', (0.46, 0.05, 0.83), (0.57, 0.62, 0.85), coat)
cube('Coat body', (0, 0.08, 2.04), (1.95, 0.76, 1.95), coat, 0.07)
cube('Left coat lapel', (-0.39, -0.335, 2.34), (0.40, 0.09, 1.28), coat_light, 0.018)
cube('Right coat lapel', (0.39, -0.335, 2.34), (0.40, 0.09, 1.28), coat_light, 0.018)
cube('Shirt front', (0, -0.36, 2.46), (0.55, 0.12, 1.48), skin, 0.01)
cube('Turquoise tie', (0, -0.435, 2.28), (0.28, 0.09, 1.05), teal, 0.012)
for z in (1.82, 2.13):
    cube('Pixel tie motif', (0.025, -0.49, z), (0.27, 0.035, 0.20), teal_light, 0)
for x in (-0.99, 0.99):
    cube('Angular shoulder', (x, 0.06, 2.72), (0.58, 0.82, 0.63), coat, 0.045)
    cube('Sleeve cuff', (x, -0.01, 0.91), (0.56, 0.65, 0.22), teal_dark, 0.015)
    for z in (1.12, 1.35):
        cube('Sleeve pixel piping', (x + (0.12 if x < 0 else -0.12), -0.36, z), (0.12, 0.035, 0.13), coral if z == 1.12 else gold, 0)
for z in (1.18, 1.48, 1.78):
    cube('Coat button', (0.63, -0.405, z), (0.07, 0.035, 0.07), gold, 0)

# Neck and signature blocky helmet.
cube('Neck', (0, 0, 3.13), (0.55, 0.53, 0.46), skin)
cube('Helmet crown', (0, 0, 4.18), (2.03, 1.12, 1.45), teal, 0.04)
cube('Helmet top plate', (0, -0.015, 4.86), (1.65, 1.08, 0.24), teal_light, 0.025)
cube('Helmet brow', (0, -0.58, 4.28), (1.76, 0.12, 0.18), teal_dark, 0.01)
# Face opening framed by chunky side guards; face is visible from the front (-Y).
cube('Face', (0, -0.37, 3.62), (1.40, 0.28, 0.79), skin, 0.015)
cube('Left helmet cheek', (-0.83, -0.53, 3.57), (0.34, 0.18, 0.62), teal, 0.012)
cube('Right helmet cheek', (0.83, -0.53, 3.57), (0.34, 0.18, 0.62), teal, 0.012)
cube('Helmet lower rim', (0, -0.48, 3.22), (1.40, 0.17, 0.16), teal_dark, 0.012)
for x in (-0.40, 0.40):
    cube('Pixel eye', (x, -0.535, 3.69), (0.22, 0.11, 0.27), teal_dark, 0.008)
    cube('Eye glint', (x - 0.035, -0.597, 3.74), (0.055, 0.025, 0.065), white, 0)
# Ear-like helmet side panels, top rails, and coral signal bars.
for x in (-1.03, 1.03):
    cube('Helmet side rail', (x, 0, 4.18), (0.18, 1.12, 1.68), teal_dark, 0.015)
    cube('Rail outer face', (x, -0.575, 4.20), (0.09, 0.04, 1.34), teal_light, 0)
    cube('Coral side indicator', (x * 1.06, -0.61, 3.60), (0.10, 0.04, 0.38), coral, 0)
for x in (-0.69, 0.69):
    cube('Coral helmet marking', (x, -0.58, 4.84), (0.45, 0.045, 0.09), coral, 0)

# Backpack silhouette and small pixel-art space trinkets.
cube('Backpack', (0, 0.55, 2.55), (1.28, 0.46, 1.45), teal_dark, 0.04)
cube('Backpack panel', (0, 0.80, 2.62), (0.92, 0.08, 0.88), coat_light, 0.02)
cube('Backpack core', (0, 0.86, 2.65), (0.43, 0.05, 0.42), teal_light, 0.01)

# Floating pixel satellites on either side.
def satellite(x, y, z, s):
    cube('Floating relic • body', (x,y,z), (s,s*0.65,s*0.65), gold, 0.025)
    cube('Relic dark casing', (x,y-0.02,z+s*0.1), (s*0.72,s*0.68,s*0.48), teal_dark, 0.015)
    cube('Relic luminous core', (x,y-0.06,z+s*0.1), (s*0.30,s*0.35,s*0.23), teal_light, 0.008)
    cube('Relic top pixel', (x,y-0.02,z+s*0.43), (s*0.28,s*0.25,s*0.12), coral, 0)
satellite(-1.62, 0.08, 3.15, 0.54)
satellite(1.66, 0.12, 4.00, 0.62)

# A stepped low plinth keeps this as a display-ready figurine.
cube('Display plinth', (0, 0.12, 0.01), (3.55, 2.65, 0.22), teal_dark, 0.055)
cube('Plinth brass inlay', (0, -1.16, 0.02), (2.65, 0.025, 0.035), gold, 0)

# Studio floor, lighting and camera.
cube('Ground', (0, 0, -0.23), (200, 200, 0.18), groundmat, 0)
world = bpy.context.scene.world
world.color = (0.025, 0.035, 0.07)
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.025, 0.035, 0.07, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35

def area(name, loc, power, color, size):
    bpy.ops.object.light_add(type='AREA', location=loc)
    l = bpy.context.object
    l.name = name
    l.data.energy = power
    l.data.color = color
    l.data.shape = 'DISK'
    l.data.size = size
    l.rotation_euler = (Vector((0,0,2.3)) - l.location).to_track_quat('-Z','Y').to_euler()
area('Key • softbox', (4,-6,8), 950, (0.72,0.91,1.0), 5)
area('Fill • warm', (-5,-3,4.5), 700, (1.0,0.62,0.40), 4)
area('Rim • aqua', (2,4,6), 1200, (0.20,0.85,1.0), 3)
bpy.ops.object.camera_add(location=(5.5,-11,6.2))
cam = bpy.context.object
cam.name = 'Portrait camera'
cam.rotation_euler = (Vector((0,0,2.55)) - cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 8.4
scene = bpy.context.scene
scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 64
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = r'C:\Users\akhad\Downloads\cosmic_avatar_preview.png'
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.color_mode = 'RGBA'

# Set camera view on open and save a native editable project.
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = None
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type == 'VIEW_3D':
            a.spaces.active.region_3d.view_perspective = 'CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=r'C:\Users\akhad\Downloads\cosmic_avatar.blend')
bpy.ops.render.render(write_still=True)
