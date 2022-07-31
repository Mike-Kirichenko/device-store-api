const { Op } = require("sequelize");
const uuid = require("uuid");
const path = require("path");
const fs = require("fs");

const { Device, Type, Brand } = require("../models");

exports.all = async (req, res) => {
  const limit = 2;
  const queryParams = {};
  const { brandId, typeId, minPrice, maxPrice, p } = req.query;

  if (brandId) queryParams.brandId = brandId;
  if (typeId) queryParams.typeId = typeId;
  if (minPrice) {
    queryParams.price = {
      ...queryParams.price,
      [Op.gte]: minPrice,
    };
  }
  if (maxPrice) {
    queryParams.price = {
      ...queryParams.price,
      [Op.lte]: maxPrice,
    };
  }

  try {
    let queryObj = { include: [{ model: Type }, { model: Brand }] };

    if (Object.keys(queryParams).length) {
      queryObj = { ...queryObj, where: queryParams };
    }
    if (p) {
      const offset = p * limit - limit;
      queryObj.limit = limit;
      queryObj.offset = offset;
    }

    const all = await Device.findAll(queryObj);

    return res.send(all);
  } catch (err) {
    return res.status(422).send({ msg: err.message });
  }
};

exports.add = async (req, res) => {
  const { name, price, brandId, typeId, descr } = req.body;
  const whiteList = ["image/jpeg", "image/png"];
  const uploadPath = "./img/device-imgs";
  const errors = [];

  try {
    if (!req.files) {
      errors.push("image is required");
    } else if (!whiteList.includes(req.files.img.mimetype)) {
      errors.push("unsupported file extension");
    }

    if (!name) {
      errors.push("name is required");
    }

    if (!price || isNaN(price)) {
      errors.push("no price or invalid price passed");
    }

    if (!brandId) {
      errors.push("brand id is required");
    }

    if (!typeId) {
      errors.push("type id is required");
    }

    if (!descr) {
      errors.push("description is required");
    }

    if (!errors.length) {
      const { img } = req.files;
      const imgInfo = img.name.split(".");
      const imgExt = imgInfo[imgInfo.length - 1];
      const fileName = `${uuid.v4()}.${imgExt}`;

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      await img.mv(path.resolve(__dirname, "..", uploadPath, fileName));

      const deviceCreated = await Device.create({
        name,
        price,
        brandId,
        typeId,
        descr,
        img: `device-imgs/${fileName}`,
      });
      if (deviceCreated) this.all(req, res);
    } else {
      return res.status(422).send({ errors });
    }
  } catch (err) {
    return res.status(422).send({ msg: err.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  let deviceRow;

  try {
    deviceRow = await Device.findOne({ where: { id } });
    if (!deviceRow)
      return res.status(404).send({ msg: `row with id:${id} not found!` });
  } catch (err) {
    return res.status(422).send({ msg: err.message });
  }

  try {
    const { img: imgPath } = deviceRow;
    fs.unlinkSync(`./img/${imgPath}`);
    const deleted = await Device.destroy({ where: { id } });
    if (deleted) this.all(req, res);
  } catch (err) {
    return res.status(422).send({ msg: err.message });
  }
};

exports.one = async (req, res) => {
  const { id } = req.params;
  try {
    const one = await Device.findOne({
      where: { id },
      include: [{ model: Type }, { model: Brand }],
    });
    if (one) return res.send(one);
    else res.status(404).send({ msg: `row with id:${id} not found!` });
  } catch (err) {
    return res.status(422).send({ msg: err.message });
  }
};