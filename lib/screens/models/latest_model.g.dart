// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'latest_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LatestModelAdapter extends TypeAdapter<LatestModel> {
  @override
  final int typeId = 2;

  @override
  LatestModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LatestModel(
      fields[0] as String,
      fields[1] as String,
      fields[2] as String,
      fields[3] as String,
      fields[4] as String,
      fields[5] as String,
      fields[6] as String,
      fields[7] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, LatestModel obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.image)
      ..writeByte(2)
      ..write(obj.publishedAt)
      ..writeByte(3)
      ..write(obj.siteID)
      ..writeByte(4)
      ..write(obj.sitetitle)
      ..writeByte(5)
      ..write(obj.titles)
      ..writeByte(6)
      ..write(obj.url)
      ..writeByte(7)
      ..write(obj.readFlg);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LatestModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
